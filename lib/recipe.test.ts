// Runnable self-check for the food/ref macro helpers.
// Run: node --experimental-strip-types lib/recipe.test.ts
import assert from 'node:assert'
import { parseRefs, refMacros, measureFactor, sumRefs, foodsMap, type Food } from './recipe.ts'

const rice: Food = { id: 1, name: 'rice', baseUnit: 'g', calories: 1.3, protein: 0.024, carbs: 0.28, fats: 0.003, measures: [{ unit: 'cup', perBase: 185 }] }
const egg: Food = { id: 2, name: 'egg', baseUnit: 'egg', calories: 72, protein: 6, carbs: 0.4, fats: 5, measures: [] }
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

// sum across refs
const total = sumRefs([{ foodId: 1, quantity: 100, measure: 'g' }, { foodId: 2, quantity: 2, measure: 'egg' }], map)
assert.strictEqual(total.calories, 130 + 144)
assert.strictEqual(total.protein, 2.4 + 12)

// parse guards
assert.deepStrictEqual(parseRefs('not json'), [])
assert.deepStrictEqual(parseRefs('[{"quantity":1}]'), []) // no foodId → dropped
assert.strictEqual(parseRefs('[{"foodId":3,"quantity":2,"measure":"g"}]')[0].foodId, 3)

// foodsMap parses stringified measures from DB rows
const m2 = foodsMap([{ id: 1, name: 'rice', baseUnit: 'g', calories: 1.3, protein: 0, carbs: 0, fats: 0, measures: '[{"unit":"cup","perBase":185}]' }])
assert.strictEqual(m2.get(1)!.measures[0].perBase, 185)

console.log('food/ref helpers: all checks passed')
