// Runnable self-check for the food/ref nutrient helpers.
// Run: node --experimental-strip-types lib/recipe.test.ts
import assert from 'node:assert'
import {
  parseRefs, parseNutrients, refMacros, refNutrients, measureFactor, sumRefs, sumNutrients,
  nutrientsForRefs, coreMacros, foodsMap, formatIngredientLine, sumEntries,
  parseStages, parseStageLines, stageLines, convertUnit, slotCount, slotSeconds, slotOfIngredient,
  stageLabel,
  type Food, type NutrientEntry,
} from './recipe.ts'
import { localDate, toDateParam } from './date.ts'
import { stageRangeIssues } from './mealSchema.ts'

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

// ── Cook mode: stages + unit conversion ───────────────────────────────────────

// parseStages guards the shape. A missing `to` must mean "no ingredient span" (-1), not row 0 —
// defaulting it to 0 would paint every un-authored stage over the first ingredient.
assert.deepStrictEqual(parseStages('[{"name":"Simmer","slot":2,"seconds":90,"from":3,"to":5}]'), [
  { name: 'Simmer', detail: undefined, timing: '', hint: undefined, seconds: 90, slot: 2, from: 3, to: 5, meanwhile: undefined },
])
assert.strictEqual(parseStages('[{"name":"Step one"}]')[0].to, -1)
assert.strictEqual(parseStages('[{"name":""},{"name":"  "}]').length, 0) // unnamed stages dropped
assert.strictEqual(parseStages('not json').length, 0)
assert.strictEqual(parseStages('{"name":"x"}').length, 0) // object, not array
assert.strictEqual(parseStages('[{"name":"x","slot":-4,"seconds":-9}]')[0].slot, 0) // clamped
assert.strictEqual(parseStages('[{"name":"x","meanwhile":true}]')[0].meanwhile, true)

// The textarea format: name and timing are positional, everything after is keyword-matched, so
// the author can drop or reorder fields.
const authored = parseStageLines([
  'Soften the onion | 5–6 min | 330s | slot 0 | ing 0-1',
  'Warm the pita |  | 0s | slot 1 | ing 6 | meanwhile',
  'Serve | | | slot 2 | medium-low · thickened',
  '   ', // blank lines ignored
].join('\n'))
assert.strictEqual(authored.length, 3)
assert.deepStrictEqual(authored[0], { name: 'Soften the onion', timing: '5–6 min', seconds: 330, slot: 0, from: 0, to: 1 })
assert.strictEqual(authored[1].meanwhile, true)
assert.strictEqual(authored[1].from, 6)
assert.strictEqual(authored[1].to, 6) // single index spans one row
assert.strictEqual(authored[2].hint, 'medium-low · thickened')
assert.strictEqual(authored[2].to, -1) // no `ing` field → no span

// Round-trip through the serializer the editor seeds from.
assert.deepStrictEqual(parseStageLines(stageLines(authored)), authored)

// convertUnit: weight/volume both ways, count units untouched.
assert.strictEqual(Math.round(convertUnit(2, 'cup', 'Metric').quantity), 473)
assert.strictEqual(convertUnit(2, 'cup', 'Metric').unit, 'ml')
assert.strictEqual(Math.round(convertUnit(1, 'lb', 'Metric').quantity), 454)
assert.strictEqual(Math.round(convertUnit(425, 'g', 'US').quantity), 15) // the "15 oz can" case
assert.strictEqual(convertUnit(425, 'g', 'US').unit, 'oz')
assert.deepStrictEqual(convertUnit(3, 'egg', 'Metric'), { quantity: 3, unit: 'egg' })
assert.deepStrictEqual(convertUnit(2, 'can', 'US'), { quantity: 2, unit: 'can' })
assert.strictEqual(convertUnit(100, 'g', 'Metric').unit, 'g') // already metric — no double convert

// Slot derivation. The parallel case: slot 1 holds a 540s sear and a 360s "meanwhile" char, so
// the slot must run for the LONGER of the two or the sear gets cut short.
const chart = parseStageLines([
  'Season | 5 min | 300s | slot 0 | ing 0-2',
  'Sear | 8–10 min | 540s | slot 1 | ing 0-1',
  'Char the salsa veg | 6 min | 360s | slot 1 | ing 3-5 | meanwhile',
  'Rest and slice | 5 min | 300s | slot 2 | ing 6-7',
  'Plate | | 0s | slot 3 | ing 8',
].join('\n'))
assert.strictEqual(slotCount(chart), 4)
assert.strictEqual(slotSeconds(chart, 1), 540)
assert.strictEqual(slotSeconds(chart, 3), 0) // untimed slot → "no timer", not 0:00 counting down
assert.strictEqual(slotCount([]), 0)
// Ingredients 0-1 are used by both slot 0 and slot 1 — they go in at the earlier one.
assert.strictEqual(slotOfIngredient(chart, 0), 0)
assert.strictEqual(slotOfIngredient(chart, 2), 0)
assert.strictEqual(slotOfIngredient(chart, 4), 1) // only the meanwhile stage claims it
assert.strictEqual(slotOfIngredient(chart, 8), 3)
assert.strictEqual(slotOfIngredient(chart, 99), -1) // unclaimed
// A step-backfilled meal (no spans at all) claims no ingredients rather than row 0.
assert.strictEqual(slotOfIngredient(parseStageLines('Blend it | | 0s | slot 0'), 0), -1)

// stageLabel turns a whole instruction into something that fits a chart cell. A card is a few
// words wide; the instruction itself lives in `detail` and is revealed on hover/focus.
assert.strictEqual(stageLabel('Wilt the greens'), 'Wilt the greens') // already short — untouched
assert.strictEqual(
  stageLabel('Herby yoghurt: mix the yoghurt, crushed garlic, lemon zest, chives, and a pinch of salt.'),
  'Herby yoghurt' // "Label: …" prefix wins
)
assert.strictEqual(
  stageLabel('Toss the chickpeas with salt and paprika, then air fry at 220°C for 20 minutes'),
  'Toss the chickpeas with salt and paprika' // first clause
)
// No colon or comma in reach: cut on a word boundary and mark the truncation.
const long = stageLabel('Scrape every browned bit off the bottom of the pan before the lid goes on')
assert.ok(long.endsWith('…') && long.length <= 48, long)
assert.ok(!long.endsWith(' …'))
// A colon far into the sentence must not be mistaken for a label prefix.
assert.ok(stageLabel('Cook the onions down slowly until they are jammy and sweet: about 25 minutes').endsWith('…'))

// `> …` carries the instruction through the textarea format, and survives a round-trip.
const detailed = parseStageLines('Sear | 8–10 min | 540s | slot 1 | ing 0-1 | crust | > Get the pan smoking, then lay the steak away from you.')
assert.strictEqual(detailed[0].detail, 'Get the pan smoking, then lay the steak away from you.')
assert.strictEqual(detailed[0].hint, 'crust') // still distinguished from the detail
assert.deepStrictEqual(parseStageLines(stageLines(detailed)), detailed)
assert.strictEqual(parseStages('[{"name":"x","detail":"  "}]')[0].detail, undefined) // blank → absent

// Stage ranges index the ingredient list they were authored against, so an agent (or a careless
// PUT) claiming rows nobody sent has to be rejected before it paints a block over them.
assert.deepStrictEqual(stageRangeIssues([{ name: 'Sear', from: 0, to: 1 }], 4), [])
assert.deepStrictEqual(stageRangeIssues([{ name: 'Assemble', from: 0, to: -1 }], 0), []) // no span, no rows needed
assert.strictEqual(stageRangeIssues([{ name: 'Bad', from: 0, to: 5 }], 2).length, 1)
assert.match(stageRangeIssues([{ name: 'Bad', from: 0, to: 5 }], 2)[0], /claims ingredient 5 but only 2/)
assert.strictEqual(stageRangeIssues([{ name: 'A', from: 0, to: 9 }, { name: 'B', from: 0, to: 1 }], 3).length, 1)

console.log('parseStages / parseStageLines / convertUnit / slots / stageLabel / stageRangeIssues: all checks passed')
