/**
 * Reorders every meal's ingredient list into cooking order, derived from its own authored stages.
 *
 * The cook-mode chart reads ingredients as rows and stages as columns, so a stage block spans the
 * rows it consumes. That only reads as a staircase when the ingredient list runs in the order the
 * recipe uses them. Several recipes list by component instead (Crispy Chicken starts with the
 * chicken and potato, but its first step makes the sauce), so their charts climbed back up the
 * grid instead of descending.
 *
 * Nothing is hardcoded here: the order comes from the stages already in the database. An
 * ingredient belongs to the FIRST stage (in slot order) that consumes it, ingredients are then
 * sorted by that stage, and each stage's from/to is recomputed from its new positions — which
 * makes every range contiguous by construction. Ingredients no stage claims keep their relative
 * order at the end.
 *
 * WeeklyPlanMeal rows carry their own copy of the ingredients (per-placement portion edits), and
 * stage ranges index the MEAL's list, so those copies are permuted to match or the chart would
 * label the wrong rows on a /meals/[id]?pm= view. Placements are matched by food, with the
 * measure only breaking ties between repeats of the same food (a recipe can list olive oil twice),
 * because a placement may restate a quantity in a different unit than the recipe. Anything a
 * placement has that the meal doesn't is appended, keeping its relative order.
 *
 * Re-run safety: a meal whose ingredients are already in cooking order computes the identity
 * permutation and is skipped, so this is a no-op on a second run. Meals whose stages claim no
 * ingredients (the step-ladder fallback) have no order to derive and are left alone. Macros are
 * sums over the refs and don't depend on order, so no cache needs recomputing.
 */
module.exports = async (db) => {
  // Stage order in time: by slot, then by the order they were authored within the slot.
  const inCookingOrder = (stages) =>
    stages.map((st, i) => ({ st, i })).sort((a, b) => a.st.slot - b.st.slot || a.i - b.i)

  // Which stage first consumes each ingredient index. -1 = nothing claims it.
  function owners(stages, count) {
    const owner = new Array(count).fill(-1)
    inCookingOrder(stages).forEach(({ st }, rank) => {
      if (!(st.to >= st.from)) return
      for (let i = st.from; i <= Math.min(st.to, count - 1); i++) {
        if (owner[i] === -1) owner[i] = rank
      }
    })
    return owner
  }

  // Permute a placement's refs by the meal's permutation. Pairing is by FOOD, not by
  // (food, measure): a placement is free to restate a quantity in another unit — a mango the
  // recipe lists in cups can be 130 g in the plan — and keying on the measure would treat that as
  // a foreign ingredient and strand it at the end, out of step with the chart's rows. The measure
  // only breaks ties between repeats of the same food (a recipe can list olive oil twice).
  function reorderPlacement(placementRefs, oldMealRefs, newOrder) {
    const buckets = new Map()
    placementRefs.forEach((r, i) => {
      if (!buckets.has(r.foodId)) buckets.set(r.foodId, [])
      buckets.get(r.foodId).push(i)
    })
    const taken = new Set()
    const ordered = []
    for (const oldIndex of newOrder) {
      const want = oldMealRefs[oldIndex]
      const bucket = buckets.get(want.foodId)
      if (!bucket || bucket.length === 0) continue
      const sameMeasure = bucket.findIndex((i) => (placementRefs[i].measure ?? '') === (want.measure ?? ''))
      const [i] = bucket.splice(sameMeasure >= 0 ? sameMeasure : 0, 1)
      taken.add(i)
      ordered.push(placementRefs[i])
    }
    // Whatever the placement has that the meal no longer does — a hand-edited placement — keeps
    // its relative order at the end rather than being dropped.
    placementRefs.forEach((r, i) => { if (!taken.has(i)) ordered.push(r) })
    return ordered
  }

  const { rows: meals } = await db.execute('SELECT id, title, ingredients, stages FROM "Meal"')
  let reordered = 0, already = 0, noStages = 0, placementsMoved = 0

  for (const m of meals) {
    let refs, stages
    try {
      refs = JSON.parse(m.ingredients)
      stages = JSON.parse(m.stages)
    } catch { continue }
    if (!Array.isArray(refs) || !Array.isArray(stages) || refs.length === 0) { noStages++; continue }
    if (!stages.some((st) => st && st.to >= st.from)) { noStages++; continue }

    const owner = owners(stages, refs.length)
    const newOrder = refs.map((_, i) => i).sort((a, b) => {
      const ra = owner[a] === -1 ? Number.MAX_SAFE_INTEGER : owner[a]
      const rb = owner[b] === -1 ? Number.MAX_SAFE_INTEGER : owner[b]
      return ra - rb || a - b
    })
    const unchanged = newOrder.every((oldIndex, i) => oldIndex === i)
    const position = new Map(newOrder.map((oldIndex, i) => [oldIndex, i]))
    const ordered = newOrder.map((i) => refs[i])

    // Recompute each stage's span from where its ingredients landed. Contiguous by construction.
    const ranks = new Map(inCookingOrder(stages).map(({ i }, rank) => [i, rank]))
    const nextStages = stages.map((st, i) => {
      const mine = owner.map((o, idx) => (o === ranks.get(i) ? position.get(idx) : -1)).filter((x) => x >= 0)
      return mine.length === 0
        ? { ...st, from: 0, to: -1 }
        : { ...st, from: Math.min(...mine), to: Math.max(...mine) }
    })

    if (unchanged) {
      already++
    } else {
      await db.execute({
        sql: 'UPDATE "Meal" SET ingredients=?, stages=? WHERE id=?',
        args: [JSON.stringify(ordered), JSON.stringify(nextStages), m.id],
      })
      reordered++
    }

    // Placements are normalised even when the meal itself was already in cooking order: a
    // placement can carry its own order (they diverge as soon as one is edited), and the chart on
    // /meals/[id]?pm= renders the PLACEMENT's rows against the MEAL's stage ranges. Any divergence
    // there labels the wrong rows.

    const { rows: placements } = await db.execute({
      sql: 'SELECT id, ingredients FROM "WeeklyPlanMeal" WHERE mealId=?',
      args: [m.id],
    })
    for (const p of placements) {
      let pRefs
      try {
        pRefs = JSON.parse(p.ingredients)
      } catch { continue }
      if (!Array.isArray(pRefs) || pRefs.length === 0) continue
      const nextRefs = reorderPlacement(pRefs, refs, newOrder)
      if (JSON.stringify(nextRefs) === JSON.stringify(pRefs)) continue
      await db.execute({
        sql: 'UPDATE "WeeklyPlanMeal" SET ingredients=? WHERE id=?',
        args: [JSON.stringify(nextRefs), p.id],
      })
      placementsMoved++
    }
  }

  console.log(
    `[migrate] ingredients_cooking_order: reordered ${reordered} meals (${placementsMoved} plan placements followed), ` +
    `${already} already in order, ${noStages} without ingredient-claiming stages`
  )
}
