import { prisma } from '@/lib/prisma'
import { parseMeasures, parseRefs, sumRefs, foodsMap, type Food, type IngredientRef, type Macros, type NutrientEntry } from '@/lib/recipe'
import type { ImportIngredient } from '@/lib/mealSchema'

function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }

// Case-insensitive name lookup — SQLite's default TEXT collation is case-sensitive, so a plain
// findUnique({where:{name}}) misses "Egg" when asked for "egg" and silently creates a duplicate
// food instead of reusing the source of truth. excludeId lets a rename check for conflicts
// against every *other* food.
//
// Every function here takes userId first and it is not optional: these are raw/bulk queries
// where a forgotten filter leaks another user's library, so the compiler is the reminder.
export async function findFoodByName(userId: string, name: string, excludeId?: number) {
  // Raw SQL gets no scoping for free — the userId predicate here is hand-written and must
  // stay. Without it a rename-conflict check would see across accounts.
  const rows = excludeId == null
    ? await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM "Food" WHERE "userId" = ${userId} AND name = ${name} COLLATE NOCASE LIMIT 1`
    : await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM "Food" WHERE "userId" = ${userId} AND name = ${name} COLLATE NOCASE AND id != ${excludeId} LIMIT 1`
  const row = rows[0]
  return row ? prisma.food.findFirst({ where: { id: row.id, userId } }) : null
}

// Load the user's foods as an id→Food map (measures parsed) for macro computation.
export async function loadFoodsMap(userId: string): Promise<Map<number, Food>> {
  const foods = await prisma.food.findMany({ where: { userId } })
  return foodsMap(foods)
}

// Cached macro totals for a meal's ingredient-refs JSON, from the current foods.
export async function macrosForRefs(userId: string, ingredientsJson: string) {
  const map = await loadFoodsMap(userId)
  return sumRefs(parseRefs(ingredientsJson), map)
}

// Agent import: turn name-based ingredients into food refs, creating foods as needed.
// Existing foods (source of truth) are referenced, not overwritten. When no per-ingredient
// macros are given, the top-level totals are split evenly across the ingredients.
export async function importIngredientsToRefs(
  userId: string,
  raw: (string | ImportIngredient)[],
  totals: Macros,
): Promise<{ refs: IngredientRef[]; macros: Macros; warnings: string[] }> {
  const items: ImportIngredient[] = raw.map(i =>
    typeof i === 'string' ? { name: i, unit: '', quantity: 1 } : i
  )
  const provided = items.reduce((s, i) => s + num(i.calories) + num(i.protein) + num(i.carbs) + num(i.fats), 0)
  const evenSplit = provided <= 0
  const nn = items.length || 1
  const refs: IngredientRef[] = []
  const warnings: string[] = []
  for (const it of items) {
    const name = it.name.trim()
    if (!name) continue
    const q = num(it.quantity) || 1
    const m = evenSplit
      ? { calories: totals.calories / nn, protein: totals.protein / nn, carbs: totals.carbs / nn, fats: totals.fats / nn }
      : { calories: num(it.calories), protein: num(it.protein), carbs: num(it.carbs), fats: num(it.fats) }
    const baseUnit = (it.unit || '').trim() || 'unit'
    let food = await findFoodByName(userId, name)
    if (!food) {
      const nutrients: NutrientEntry[] = [
        { key: 'calories', label: 'Calories', unit: 'kcal', amount: m.calories / q, group: 'macro' },
        { key: 'protein_g', label: 'Protein', unit: 'g', amount: m.protein / q, group: 'macro' },
        { key: 'carbs_g', label: 'Carbs', unit: 'g', amount: m.carbs / q, group: 'macro' },
        { key: 'fat_g', label: 'Fat', unit: 'g', amount: m.fats / q, group: 'macro' },
      ]
      food = await prisma.food.create({
        data: { userId, name, baseUnit, nutrients: JSON.stringify(nutrients), measures: '[]' },
      })
    }
    refs.push({ foodId: food.id, quantity: q, measure: resolveMeasure(food, it.unit, name, warnings) })
  }
  const map = await loadFoodsMap(userId)
  return { refs, macros: sumRefs(refs, map), warnings }
}

// Which measure to store a ref in. The unit the caller sent has to be honoured or the quantity
// changes meaning: "2 shots" of a food whose baseUnit is ml became 2 ml — an espresso reduced to
// two drops — because this used to always store the baseUnit. An unknown unit still falls back to
// the baseUnit (nothing better exists) but says so, since the number is then being reinterpreted.
function resolveMeasure(
  food: { baseUnit: string; measures: string },
  unit: string | undefined,
  name: string,
  warnings: string[],
): string {
  const base = food.baseUnit || 'unit'
  const want = (unit ?? '').trim().toLowerCase()
  if (!want || want === base.toLowerCase()) return base

  const measures = parseMeasures(food.measures)
  // Match a declared measure, tolerating the plural an agent naturally writes ("2 shots").
  const hit = measures.find(m => {
    const u = m.unit.trim().toLowerCase()
    return u === want || `${u}s` === want || u === `${want}s`
  })
  if (hit) return hit.unit

  warnings.push(
    `"${name}": unit "${unit}" is not a measure on that food, so the quantity was read as ${base}. ` +
    `Add the measure with upsert_food (measures: [{unit, perBase}]) and re-import, or send the amount in ${base}.`
  )
  return base
}

// Recompute the cached macro columns on meals from the current foods. Meal macros are
// derived, so this is the propagation step: call after a food edit, or for a saved meal.
// Pass mealIds to limit the work; omit to recompute every meal.
export async function recomputeMealCache(userId: string, mealIds?: number[]): Promise<void> {
  const map = await loadFoodsMap(userId)
  const meals = await prisma.meal.findMany({
    where: mealIds ? { userId, id: { in: mealIds } } : { userId },
  })
  for (const m of meals) {
    const t = sumRefs(parseRefs(m.ingredients), map)
    await prisma.meal.update({
      where: { id: m.id }, // m came from the userId-scoped findMany above

      data: { calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats },
    })
  }
}
