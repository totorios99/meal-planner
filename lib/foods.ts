import { prisma } from '@/lib/prisma'
import { parseRefs, sumRefs, foodsMap, type Food, type IngredientRef, type Macros, type NutrientEntry } from '@/lib/recipe'
import type { ImportIngredient } from '@/lib/mealSchema'

function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }

// Load all foods as an id→Food map (measures parsed) for macro computation.
export async function loadFoodsMap(): Promise<Map<number, Food>> {
  const foods = await prisma.food.findMany()
  return foodsMap(foods)
}

// Cached macro totals for a meal's ingredient-refs JSON, from the current foods.
export async function macrosForRefs(ingredientsJson: string) {
  const map = await loadFoodsMap()
  return sumRefs(parseRefs(ingredientsJson), map)
}

// Agent import: turn name-based ingredients into food refs, creating foods as needed.
// Existing foods (source of truth) are referenced, not overwritten. When no per-ingredient
// macros are given, the top-level totals are split evenly across the ingredients.
export async function importIngredientsToRefs(
  raw: (string | ImportIngredient)[],
  totals: Macros,
): Promise<{ refs: IngredientRef[]; macros: Macros }> {
  const items: ImportIngredient[] = raw.map(i =>
    typeof i === 'string' ? { name: i, unit: '', quantity: 1 } : i
  )
  const provided = items.reduce((s, i) => s + num(i.calories) + num(i.protein) + num(i.carbs) + num(i.fats), 0)
  const evenSplit = provided <= 0
  const nn = items.length || 1
  const refs: IngredientRef[] = []
  for (const it of items) {
    const name = it.name.trim()
    if (!name) continue
    const q = num(it.quantity) || 1
    const m = evenSplit
      ? { calories: totals.calories / nn, protein: totals.protein / nn, carbs: totals.carbs / nn, fats: totals.fats / nn }
      : { calories: num(it.calories), protein: num(it.protein), carbs: num(it.carbs), fats: num(it.fats) }
    const baseUnit = (it.unit || '').trim() || 'unit'
    let food = await prisma.food.findUnique({ where: { name } })
    if (!food) {
      const nutrients: NutrientEntry[] = [
        { key: 'calories', label: 'Calories', unit: 'kcal', amount: m.calories / q, group: 'macro' },
        { key: 'protein_g', label: 'Protein', unit: 'g', amount: m.protein / q, group: 'macro' },
        { key: 'carbs_g', label: 'Carbs', unit: 'g', amount: m.carbs / q, group: 'macro' },
        { key: 'fat_g', label: 'Fat', unit: 'g', amount: m.fats / q, group: 'macro' },
      ]
      food = await prisma.food.create({
        data: { name, baseUnit, nutrients: JSON.stringify(nutrients), measures: '[]' },
      })
    }
    refs.push({ foodId: food.id, quantity: q, measure: food.baseUnit || 'unit' })
  }
  const map = await loadFoodsMap()
  return { refs, macros: sumRefs(refs, map) }
}

// Recompute the cached macro columns on meals from the current foods. Meal macros are
// derived, so this is the propagation step: call after a food edit, or for a saved meal.
// Pass mealIds to limit the work; omit to recompute every meal.
export async function recomputeMealCache(mealIds?: number[]): Promise<void> {
  const map = await loadFoodsMap()
  const meals = await prisma.meal.findMany(
    mealIds ? { where: { id: { in: mealIds } } } : undefined
  )
  for (const m of meals) {
    const t = sumRefs(parseRefs(m.ingredients), map)
    await prisma.meal.update({
      where: { id: m.id },
      data: { calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats },
    })
  }
}
