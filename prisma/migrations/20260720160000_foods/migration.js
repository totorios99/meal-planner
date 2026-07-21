/**
 * Data migration: seed Food from existing meal/placement ingredient rows and rewrite the
 * inline {name,quantity,unit,macros} rows into {foodId,quantity,measure} refs.
 *
 * One Food per distinct ingredient name (first occurrence wins; meals win over placements).
 * Food macros are per baseUnit = old (macros / quantity). Meal cached totals are recomputed
 * from the refs. Meals that share a name adopt the shared food — later totals may shift; the
 * user refines foods in /foods and propagation recorrects.
 */
module.exports = async (db) => {
  const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
  const parse = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

  const foodByKey = new Map() // lower(name) -> { id, baseUnit, calories, protein, carbs, fats }

  async function ensureFood(ing) {
    const name = String(ing.name ?? '').trim()
    if (!name) return null
    const key = name.toLowerCase()
    const hit = foodByKey.get(key)
    if (hit) return hit
    const q = num(ing.quantity) || 1
    const baseUnit = String(ing.unit ?? '').trim() || 'unit'
    const food = {
      baseUnit,
      calories: num(ing.calories) / q,
      protein: num(ing.protein) / q,
      carbs: num(ing.carbs) / q,
      fats: num(ing.fats) / q,
    }
    const res = await db.execute({
      sql: 'INSERT INTO "Food" (name, baseUnit, calories, protein, carbs, fats, measures, updatedAt) VALUES (?,?,?,?,?,?,?,datetime(\'now\'))',
      args: [name, baseUnit, food.calories, food.protein, food.carbs, food.fats, '[]'],
    })
    food.id = Number(res.lastInsertRowid)
    foodByKey.set(key, food)
    return food
  }

  async function toRefs(ingredientsJson) {
    const refs = []
    const totals = { calories: 0, protein: 0, carbs: 0, fats: 0 }
    for (const ing of parse(ingredientsJson)) {
      const f = await ensureFood(ing)
      if (!f) continue
      const q = num(ing.quantity) || 1
      refs.push({ foodId: f.id, quantity: q, measure: f.baseUnit })
      totals.calories += f.calories * q
      totals.protein += f.protein * q
      totals.carbs += f.carbs * q
      totals.fats += f.fats * q
    }
    return { refs, totals }
  }

  // Meals first (their names are canonical), recompute cached totals from refs.
  const { rows: meals } = await db.execute('SELECT id, ingredients FROM "Meal"')
  for (const m of meals) {
    const { refs, totals } = await toRefs(m.ingredients)
    await db.execute({
      sql: 'UPDATE "Meal" SET ingredients=?, calories=?, protein=?, carbs=?, fats=? WHERE id=?',
      args: [JSON.stringify(refs), totals.calories, totals.protein, totals.carbs, totals.fats, m.id],
    })
  }

  // Placement snapshots (create foods on the fly for any name not seen in meals).
  const { rows: placements } = await db.execute('SELECT id, ingredients FROM "WeeklyPlanMeal"')
  for (const p of placements) {
    const { refs } = await toRefs(p.ingredients)
    await db.execute({ sql: 'UPDATE "WeeklyPlanMeal" SET ingredients=? WHERE id=?', args: [JSON.stringify(refs), p.id] })
  }

  console.log(`[migrate] foods: seeded ${foodByKey.size} foods, converted ${meals.length} meals + ${placements.length} placements`)
}
