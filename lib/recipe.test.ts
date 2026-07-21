// Runnable self-check for the pure ingredient/macro helpers.
// Run: node --experimental-strip-types lib/recipe.test.ts
import assert from 'node:assert'
import { parseIngredients, sumIngredients, scaleIngredient, type Ingredient } from './recipe.ts'

const rice: Ingredient = { name: 'rice', quantity: 100, unit: 'g', calories: 130, protein: 2.4, carbs: 28, fats: 0.3 }

// sum
const total = sumIngredients([rice, { ...rice, name: 'x', calories: 70, protein: 5, carbs: 0, fats: 1 }])
assert.deepStrictEqual(total, { calories: 200, protein: 7.4, carbs: 28, fats: 1.3 })

// linear scaling: 100g -> 50g halves macros
const half = scaleIngredient(rice, 50)
assert.strictEqual(half.calories, 65)
assert.strictEqual(half.quantity, 50)

// quantity 0 guard: can't derive per-unit, macros untouched
const zeroed = scaleIngredient({ ...rice, quantity: 0 }, 3)
assert.strictEqual(zeroed.calories, 130)
assert.strictEqual(zeroed.quantity, 3)

// parse guards bad input
assert.deepStrictEqual(parseIngredients('not json'), [])
assert.deepStrictEqual(parseIngredients('{}'), [])
assert.strictEqual(parseIngredients('[{"name":"a"}]')[0].calories, 0)

console.log('recipe helpers: all checks passed')
