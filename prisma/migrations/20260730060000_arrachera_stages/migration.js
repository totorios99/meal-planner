/**
 * Arrachera Tacos: the nopal salad is made while the steak fries, so it belongs in the steak's
 * time slot rather than in one of its own.
 *
 * 20260730051500_stage_authoring gave this recipe real labels but left the salad sequential —
 * step 0 came first in the text, so it got slot 0 on its own. Every other change here follows from
 * that: the slots after it shift down by one, and the ingredient list is re-derived into cooking
 * order (steak and oil now lead, the salad components follow) using the same rule as
 * 20260730053000_ingredients_cooking_order, which has already run and won't run again.
 *
 * Guarded: only applied while the stages are exactly what stage_authoring wrote. Edit this recipe
 * in the meal editor and this migration leaves it alone.
 */
const TITLE = 'Arrachera Tacos'

// What stage_authoring left behind — the shape this migration is allowed to replace.
const EXPECTED = [
  { name: 'Toss the nopal salad', slot: 0 },
  { name: 'Fry the arrachera', slot: 1 },
  { name: 'Chop the steak', slot: 2 },
  { name: 'Warm the tortillas', slot: 2 },
  { name: 'Fill and serve', slot: 3 },
]

// step = index into the recipe's own steps, whose text stays the instruction verbatim.
const AUTHORED = [
  { name: 'Fry the arrachera', timing: '', seconds: 0, slot: 0, from: 4, to: 5, step: 1 },
  { name: 'Toss the nopal salad', timing: '', seconds: 0, slot: 0, from: 0, to: 3, meanwhile: true, step: 0 },
  { name: 'Chop the steak', timing: '', seconds: 0, slot: 1, from: 0, to: -1, step: 2 },
  { name: 'Warm the tortillas', timing: '', seconds: 0, slot: 1, from: 6, to: 6, meanwhile: true, step: 3 },
  { name: 'Fill and serve', timing: '', seconds: 0, slot: 2, from: 7, to: 8, step: 4 },
]

module.exports = async (db) => {
  const { rows } = await db.execute({
    sql: 'SELECT id, ingredients, stages, steps FROM "Meal" WHERE title = ?',
    args: [TITLE],
  })
  if (rows.length !== 1) {
    console.log(`[migrate] arrachera_stages: ${rows.length} meals named "${TITLE}", skipping`)
    return
  }
  const meal = rows[0]

  let refs, stages, steps
  try {
    refs = JSON.parse(meal.ingredients)
    stages = JSON.parse(meal.stages)
    steps = JSON.parse(meal.steps)
  } catch {
    console.log('[migrate] arrachera_stages: unparseable columns, skipping')
    return
  }

  const asExpected =
    stages.length === EXPECTED.length &&
    stages.every((s, i) => s.name === EXPECTED[i].name && s.slot === EXPECTED[i].slot)
  if (!asExpected) {
    console.log('[migrate] arrachera_stages: stages already edited, leaving them alone')
    return
  }
  if (AUTHORED.some((a) => a.to >= refs.length) || AUTHORED.some((a) => steps[a.step] === undefined)) {
    console.log('[migrate] arrachera_stages: recipe no longer matches the authored indices, skipping')
    return
  }

  const authored = AUTHORED.map(({ step, ...rest }) => ({ ...rest, detail: steps[step] }))

  // Re-derive cooking order: an ingredient belongs to the first stage that consumes it, ingredients
  // sort by that stage, and each stage's span is recomputed from where they land.
  const ranked = authored.map((st, i) => ({ st, i })).sort((a, b) => a.st.slot - b.st.slot || a.i - b.i)
  const owner = new Array(refs.length).fill(-1)
  ranked.forEach(({ st }, rank) => {
    if (!(st.to >= st.from)) return
    for (let i = st.from; i <= Math.min(st.to, refs.length - 1); i++) if (owner[i] === -1) owner[i] = rank
  })
  const newOrder = refs.map((_, i) => i).sort((a, b) => {
    const ra = owner[a] === -1 ? Number.MAX_SAFE_INTEGER : owner[a]
    const rb = owner[b] === -1 ? Number.MAX_SAFE_INTEGER : owner[b]
    return ra - rb || a - b
  })
  const position = new Map(newOrder.map((oldIndex, i) => [oldIndex, i]))
  const rankOf = new Map(ranked.map(({ i }, rank) => [i, rank]))
  const nextStages = authored.map((st, i) => {
    const mine = owner.map((o, idx) => (o === rankOf.get(i) ? position.get(idx) : -1)).filter((x) => x >= 0)
    return mine.length === 0 ? { ...st, from: 0, to: -1 } : { ...st, from: Math.min(...mine), to: Math.max(...mine) }
  })

  await db.execute({
    sql: 'UPDATE "Meal" SET ingredients=?, stages=? WHERE id=?',
    args: [JSON.stringify(newOrder.map((i) => refs[i])), JSON.stringify(nextStages), meal.id],
  })

  // Placements keep their own copy of the ingredients and the ?pm= chart renders those against
  // these stage ranges, so they follow. Paired by food — a plan may restate a unit.
  const { rows: placements } = await db.execute({
    sql: 'SELECT id, ingredients FROM "WeeklyPlanMeal" WHERE mealId = ?',
    args: [meal.id],
  })
  let moved = 0
  for (const p of placements) {
    let pRefs
    try {
      pRefs = JSON.parse(p.ingredients)
    } catch { continue }
    if (!Array.isArray(pRefs) || pRefs.length === 0) continue
    const buckets = new Map()
    pRefs.forEach((r, i) => {
      if (!buckets.has(r.foodId)) buckets.set(r.foodId, [])
      buckets.get(r.foodId).push(i)
    })
    const taken = new Set()
    const ordered = []
    for (const oldIndex of newOrder) {
      const want = refs[oldIndex]
      const bucket = buckets.get(want.foodId)
      if (!bucket || bucket.length === 0) continue
      const same = bucket.findIndex((i) => (pRefs[i].measure ?? '') === (want.measure ?? ''))
      const [i] = bucket.splice(same >= 0 ? same : 0, 1)
      taken.add(i)
      ordered.push(pRefs[i])
    }
    pRefs.forEach((r, i) => { if (!taken.has(i)) ordered.push(r) })
    if (JSON.stringify(ordered) === JSON.stringify(pRefs)) continue
    await db.execute({ sql: 'UPDATE "WeeklyPlanMeal" SET ingredients=? WHERE id=?', args: [JSON.stringify(ordered), p.id] })
    moved++
  }

  console.log(`[migrate] arrachera_stages: salad now runs alongside the steak, ingredients reordered (${moved} placements followed)`)
}
