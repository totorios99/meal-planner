// Runnable self-check for the food/ref nutrient helpers.
// Run: node --experimental-strip-types lib/recipe.test.ts
import assert from 'node:assert'
import {
  parseRefs, parseNutrients, refMacros, refNutrients, measureFactor, sumRefs, sumNutrients,
  nutrientsForRefs, coreMacros, foodsMap, formatIngredientLine, sumEntries,
  type Food, type NutrientEntry,
} from './recipe.ts'
import { localDate, toDateParam } from './date.ts'

const riceNutrients: NutrientEntry[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', amount: 1.3, group: 'macro' },
  { key: 'protein_g', label: 'Protein', unit: 'g', amount: 0.024, group: 'macro' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', amount: 0.28, group: 'macro' },
  { key: 'fat_g', label: 'Fat', unit: 'g', amount: 0.003, group: 'macro' },
]
const eggNutrients: NutrientEntry[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', amount: 72, group: 'macro' },
  { key: 'protein_g', label: 'Protein', unit: 'g', amount: 6, group: 'macro' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', amount: 0.4, group: 'macro' },
  { key: 'fat_g', label: 'Fat', unit: 'g', amount: 5, group: 'macro' },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', amount: 3.8, group: 'micro' },
]
const rice: Food = { id: 1, name: 'rice', baseUnit: 'g', nutrients: riceNutrients, measures: [{ unit: 'cup', perBase: 185 }] }
const egg: Food = { id: 2, name: 'egg', baseUnit: 'egg', nutrients: eggNutrients, measures: [] }
const map = new Map<number, Food>([[1, rice], [2, egg]])

// base measure → factor 1
assert.strictEqual(measureFactor(rice, 'g'), 1)
// household measure → conversion factor
assert.strictEqual(measureFactor(rice, 'cup'), 185)
// unknown measure falls back to base (1)
assert.strictEqual(measureFactor(rice, 'blorp'), 1)

// 100 g rice = 130 kcal
assert.strictEqual(refMacros({ foodId: 1, quantity: 100, measure: 'g' }, rice).calories, 130)
// 1 cup rice = 1.3 × 185 = 240.5 kcal
assert.strictEqual(refMacros({ foodId: 1, quantity: 1, measure: 'cup' }, rice).calories, 240.5)
// missing food → zeros
assert.strictEqual(refMacros({ foodId: 9, quantity: 1, measure: 'g' }, undefined).calories, 0)

// refNutrients scales every entry generically, not just the 4 core macros
const eggX2 = refNutrients({ foodId: 2, quantity: 2, measure: 'egg' }, egg)
assert.strictEqual(eggX2.find(n => n.key === 'cholesterol_mg')!.amount, 7.6)

// sum across refs (frozen fixed-4 shape)
const total = sumRefs([{ foodId: 1, quantity: 100, measure: 'g' }, { foodId: 2, quantity: 2, measure: 'egg' }], map)
assert.strictEqual(total.calories, 130 + 144)
assert.strictEqual(total.protein, 2.4 + 12)

// nutrientsForRefs carries the full sparse breakdown — a micronutrient present on only one
// food still shows up in the merged total (missing-elsewhere → simply absent, not zeroed-in)
const full = nutrientsForRefs([{ foodId: 1, quantity: 100, measure: 'g' }, { foodId: 2, quantity: 2, measure: 'egg' }], map)
assert.strictEqual(full.find(n => n.key === 'cholesterol_mg')!.amount, 7.6)
assert.strictEqual(coreMacros(full).calories, 130 + 144)

// sumNutrients: missing key across lists → simply absent (reads as 0 via coreMacros/pick)
const sparse = sumNutrients([[{ key: 'vitamin_b12_ug', label: 'B12', unit: 'ug', amount: 1.5, group: 'micro' }], []])
assert.strictEqual(sparse.length, 1)
assert.strictEqual(coreMacros(sparse).protein, 0)

// sumNutrients never throws on a unit mismatch — sums best-effort instead
const mismatched = sumNutrients([
  [{ key: 'sodium_mg', label: 'Sodium', unit: 'mg', amount: 100, group: 'micro' }],
  [{ key: 'sodium_mg', label: 'Sodium', unit: 'g', amount: 1, group: 'micro' }],
])
assert.strictEqual(mismatched.find(n => n.key === 'sodium_mg')!.amount, 101)

// parse guards
assert.deepStrictEqual(parseRefs('not json'), [])
assert.deepStrictEqual(parseRefs('[{"quantity":1}]'), [{ foodId: 0, quantity: 1, measure: '' }]) // no foodId → blank/unfilled slot, kept
assert.strictEqual(parseRefs('[{"foodId":3,"quantity":2,"measure":"g"}]')[0].foodId, 3)

assert.deepStrictEqual(parseNutrients('not json'), [])
assert.deepStrictEqual(parseNutrients('[{"amount":1}]'), []) // no key → dropped
assert.strictEqual(parseNutrients('[{"key":"creatine_g","label":"Creatine","unit":"g","amount":5}]')[0].amount, 5)

// foodsMap parses stringified measures/nutrients from DB rows
const m2 = foodsMap([{ id: 1, name: 'rice', baseUnit: 'g', nutrients: JSON.stringify(riceNutrients), measures: '[{"unit":"cup","perBase":185}]' }])
assert.strictEqual(m2.get(1)!.measures[0].perBase, 185)
assert.strictEqual(m2.get(1)!.nutrients.find(n => n.key === 'calories')!.amount, 1.3)

console.log('food/ref helpers: all checks passed')

// The unit is dropped when the food name already ends in it, so an ingredient line reads
// "5 Oreo cookie" rather than "5 cookie Oreo cookie".
assert.strictEqual(formatIngredientLine(5, 'cookie', 'Oreo cookie'), '5 Oreo cookie')
assert.strictEqual(formatIngredientLine(5, 'tortilla', 'Corn tortilla'), '5 Corn tortilla')
assert.strictEqual(formatIngredientLine(1, 'leaf', 'Bay leaf'), '1 Bay leaf')
assert.strictEqual(formatIngredientLine(0.5, 'egg', 'Egg'), '1/2 Egg')
// but a genuinely different unit is kept
assert.strictEqual(formatIngredientLine(2, 'tbsp', 'Olive oil'), '2 tbsp Olive oil')
assert.strictEqual(formatIngredientLine(79, 'g', 'Banana'), '79 g Banana')

// sumEntries adds the core 4 across entries and ignores unparseable ingredient blobs.
const entryFoods = foodsMap([{ id: 1, name: 'rice', baseUnit: 'g', nutrients: JSON.stringify(riceNutrients), measures: '[]' }])
const twoEntries = sumEntries(
  [{ ingredients: '[{"foodId":1,"quantity":100,"measure":"g"}]' },
   { ingredients: '[{"foodId":1,"quantity":50,"measure":"g"}]' }],
  entryFoods
)
assert.strictEqual(Math.round(twoEntries.calories), 195) // 1.3 kcal/g * 150 g
assert.strictEqual(Math.round(twoEntries.carbs), 42)
assert.strictEqual(sumEntries([], entryFoods).calories, 0)
assert.strictEqual(sumEntries([{ ingredients: 'not json' }], entryFoods).calories, 0)

// localDate rebuilds the stored UTC weekStart at LOCAL midnight — a plain new Date() on the
// same string renders the previous day for anyone west of UTC.
const ws = localDate('2026-07-27T06:00:00.000Z')
assert.strictEqual(ws.getDate(), 27)
assert.strictEqual(ws.getMonth(), 6)
assert.strictEqual(localDate('2026-07-27T06:00:00.000Z', 6).getDate(), 2) // +6 days rolls into Aug
assert.strictEqual(localDate('2026-07-27T06:00:00.000Z', 6).getMonth(), 7)
assert.strictEqual(toDateParam(ws), '2026-07-27')

console.log('sumEntries / localDate: all checks passed')
