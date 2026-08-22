// The Food write boundary. A Food is the source of truth for one ingredient's nutrients, and
// every meal's macros derive from it — so a bad row here is wrong numbers on every meal card
// that references it, silently and forever.
import { it } from 'vitest'
import assert from 'node:assert/strict'
import { foodInput, nutrientEntryInput, canonicalWarnings, toFoodData, foodToJson } from './foodSchema.ts'

const nutrient = (label: string, extra: Record<string, unknown> = {}) => ({ label, ...extra })

it('derives the key from the label when an agent omits it', () => {
  // Two writers reach this schema: FoodModal sends a key, upsert_food often sends only a
  // label. They must land on the same key or the same nutrient exists twice.
  const parsed = nutrientEntryInput.parse(nutrient('Vitamin C'))
  assert.equal(parsed.key, 'vitamin_c')
  assert.equal(nutrientEntryInput.parse(nutrient('Vitamin C', { key: 'vit_c' })).key, 'vit_c',
    'an explicit key wins over the derived one')
  assert.equal(nutrientEntryInput.parse(nutrient('Vitamin C', { key: '' })).key, 'vitamin_c',
    'an empty key is treated as absent, not as a key')
})

it('defaults a nutrient to a harmless zero rather than undefined', () => {
  const parsed = nutrientEntryInput.parse(nutrient('Iron'))
  assert.equal(parsed.amount, 0, 'a missing amount contributes nothing instead of NaN')
  assert.equal(parsed.unit, '')
  assert.equal(parsed.group, 'other')
  assert.equal(nutrientEntryInput.parse(nutrient('Iron', { amount: '4.5' })).amount, 4.5,
    'numeric strings coerce — the form sends strings')
})

it('rejects a nutrient amount that is negative', () => {
  assert.equal(nutrientEntryInput.safeParse(nutrient('Iron', { amount: -1 })).success, false)
  assert.equal(nutrientEntryInput.safeParse(nutrient('Iron', { amount: 'nope' })).success, false)
  assert.equal(nutrientEntryInput.safeParse(nutrient('')).success, false, 'a label is required')
})

it('rejects two nutrients that collapse to one key', () => {
  // Read-time merging across foods cannot tell "duplicate" from "two foods agree", so the
  // duplicate has to be caught at write time or it is never caught.
  const dup = foodInput.safeParse({
    name: 'Rice',
    nutrients: [nutrient('Vitamin C', { amount: 1 }), nutrient('vitamin  c', { amount: 2 })],
  })
  assert.equal(dup.success, false, 'labels differing only in case and spacing are one key')
  assert.match(dup.error!.issues[0].message, /Duplicate nutrient key: vitamin_c/)

  const explicit = foodInput.safeParse({
    name: 'Rice',
    nutrients: [nutrient('A', { key: 'same' }), nutrient('B', { key: 'same' })],
  })
  assert.equal(explicit.success, false, 'explicit keys collide too')
})

it('rejects a label that keys to nothing', () => {
  // slugify('%') === '' — saving that would write a nutrient parseNutrients later drops on
  // the floor, so the food would appear to save and then be quietly missing a fact.
  const bad = foodInput.safeParse({ name: 'Rice', nutrients: [nutrient('%')] })
  assert.equal(bad.success, false)
  assert.match(bad.error!.issues[0].message, /needs at least one letter or number/)
})

it('capitalizes only the first character of a name', () => {
  // Food names are free text, not title case — a brand keeps its own casing.
  assert.equal(foodInput.parse({ name: 'brown rice' }).name, 'Brown rice')
  assert.equal(foodInput.parse({ name: 'Kirkland Signature Almond Butter' }).name,
    'Kirkland Signature Almond Butter', 'existing capitals survive')
  assert.equal(foodInput.parse({ name: '  spinach  ' }).name, 'Spinach', 'trimmed before capitalizing')
  assert.equal(foodInput.safeParse({ name: '   ' }).success, false, 'a whitespace-only name is no name')
})

it('rejects a measure that would divide by zero', () => {
  // measureFactor multiplies by perBase; a 0 or negative there makes every quantity using
  // that measure wrong rather than absent.
  assert.equal(foodInput.safeParse({ name: 'Rice', measures: [{ unit: 'cup', perBase: 0 }] }).success, false)
  assert.equal(foodInput.safeParse({ name: 'Rice', measures: [{ unit: 'cup', perBase: -1 }] }).success, false)
  assert.equal(foodInput.safeParse({ name: 'Rice', measures: [{ unit: '', perBase: 185 }] }).success, false,
    'a measure with no unit cannot be selected')
  assert.equal(foodInput.parse({ name: 'Rice', measures: [{ unit: 'cup', perBase: '185' }] }).measures[0].perBase, 185)
})

it('warns about missing canonical keys without blocking the save', () => {
  // Non-blocking on purpose: the warning reaches the authoring agent through the API
  // response so it notices a silent 0 before it shows on a meal card.
  const none = canonicalWarnings([])
  assert.ok(none.length > 0, 'a food with no nutrients is missing every canonical key')
  assert.ok(none.every(w => w.startsWith('missing canonical key: ')))

  const withCalories = foodInput.parse({
    name: 'Rice',
    nutrients: [nutrient('Calories', { key: 'calories', amount: 130 })],
  })
  assert.ok(!canonicalWarnings(withCalories.nutrients).includes('missing canonical key: calories'),
    'a supplied canonical key is not warned about')
})

it('round-trips through the JSON write boundary', () => {
  // nutrients/measures live in TEXT columns. If stringify and parse disagree the food loads
  // as empty, which reads as "this food has no nutrients" rather than as an error.
  const input = foodInput.parse({
    name: 'Rice',
    baseUnit: 'g',
    nutrients: [nutrient('Calories', { amount: 130, unit: 'kcal', group: 'macro' })],
    measures: [{ unit: 'cup', perBase: 185 }],
  })
  const row = toFoodData(input)
  assert.equal(typeof row.nutrients, 'string', 'stringified at the write boundary')
  assert.equal(typeof row.measures, 'string')

  const back = foodToJson({ ...row, id: 1 })
  assert.deepEqual(back.measures, [{ unit: 'cup', perBase: 185 }])
  assert.equal((back.nutrients as { key: string }[])[0].key, 'calories')
  // The rest-spread widens away the index signature, so reach for the column explicitly.
  assert.equal((back as Record<string, unknown>).name, 'Rice', 'non-JSON columns pass through untouched')
})

it('reads a corrupt JSON column as empty rather than throwing', () => {
  // A row written before a schema change, or by hand, must not take out the whole page.
  assert.deepEqual(foodToJson({ measures: 'not json', nutrients: '[]' }).measures, [])
  assert.deepEqual(foodToJson({ measures: '{}', nutrients: '[]' }).measures, [],
    'a JSON object where an array belongs is still empty')
  assert.deepEqual(foodToJson({ measures: 'null', nutrients: 'null' }).nutrients, [])
})
