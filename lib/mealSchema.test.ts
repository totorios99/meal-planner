// The meal write boundary, and — via importSchema — the only schema an outside agent posts
// to. Everything an agent sends crosses this file before it reaches the database, so it is
// the single place where malformed or hostile input is still cheap to reject.
import { it } from 'vitest'
import assert from 'node:assert/strict'
import { refSchema, stageSchema, stageRangeIssues, mealInput, toMealData, importSchema, importIngredient } from './mealSchema.ts'

// The minimum an agent must send for importSchema to be satisfied, so each test below can
// vary exactly one thing.
const validImport = {
  name: 'Arrachera',
  image: 'https://example.test/steak.jpg',
  calories: 600, protein: 40, carbs: 30, fats: 25,
  ingredients: ['200g skirt steak', '1 lime'],
  steps: ['Sear the steak.', 'Rest it.'],
}

it('requires a positive integer foodId on an ingredient ref', () => {
  // Macros derive from the referenced food, so a ref pointing nowhere is a meal that silently
  // totals zero rather than one that fails.
  assert.equal(refSchema.safeParse({ foodId: 0 }).success, false)
  assert.equal(refSchema.safeParse({ foodId: -1 }).success, false)
  assert.equal(refSchema.safeParse({ foodId: 1.5 }).success, false, 'ids are integers')
  assert.equal(refSchema.safeParse({ foodId: 'nope' }).success, false)
  assert.equal(refSchema.parse({ foodId: '3' }).foodId, 3, 'numeric strings coerce — the form sends strings')
})

it('defaults a ref to a zero quantity rather than undefined', () => {
  const r = refSchema.parse({ foodId: 1 })
  assert.equal(r.quantity, 0)
  assert.equal(r.measure, '')
  assert.equal(refSchema.safeParse({ foodId: 1, quantity: -5 }).success, false, 'negative quantity is not a portion')
})

it('defaults a stage to claiming no ingredients at all', () => {
  // `to: -1` is the whole point: a stage authored without a span must render as a plain step.
  // Defaulting to 0 would paint every un-authored stage over the first ingredient row.
  const st = stageSchema.parse({ name: 'Sear' })
  assert.equal(st.to, -1, 'no span, not row 0')
  assert.equal(st.from, 0)
  assert.equal(st.seconds, 0)
  assert.equal(st.slot, 0)
  assert.equal(stageSchema.safeParse({ name: '' }).success, false, 'a stage needs a name')
  assert.equal(stageSchema.safeParse({ name: 'Sear', to: -2 }).success, false, '-1 is the floor')
  assert.equal(stageSchema.safeParse({ name: 'Sear', slot: -1 }).success, false)
})

it('flags a stage that claims an ingredient nobody sent', () => {
  // The chart would otherwise paint a block over rows that do not exist.
  const over = stageRangeIssues([{ name: 'Sear', from: 0, to: 12 }], 8)
  assert.equal(over.length, 1)
  assert.match(over[0], /claims ingredient 12 but only 8 were sent/)

  assert.deepEqual(stageRangeIssues([{ name: 'Sear', from: 0, to: 7 }], 8), [], 'the last valid row is fine')
  assert.deepEqual(stageRangeIssues([{ name: 'Rest', from: 0, to: -1 }], 8), [], 'no span is always fine')
  assert.deepEqual(stageRangeIssues([{ name: 'Rest', from: 5, to: 2 }], 8), [],
    'to < from is a non-span, not an error')
  assert.deepEqual(stageRangeIssues([{ name: 'Sear', from: 0, to: 0 }], 0), [
    'stage "Sear" claims ingredient 0 but only 0 were sent',
  ], 'row 0 of an empty list is still out of range')
})

it('requires a title and defaults everything else', () => {
  assert.equal(mealInput.safeParse({}).success, false)
  assert.equal(mealInput.safeParse({ title: '   ' }).success, false, 'whitespace is not a title')
  const m = mealInput.parse({ title: 'Toast' })
  assert.deepEqual(m.ingredients, [])
  assert.deepEqual(m.steps, [])
  assert.equal(m.servings, 1, 'servings divides — it can never be 0')
  assert.equal(mealInput.safeParse({ title: 'Toast', servings: 0 }).success, false)
  assert.equal(mealInput.safeParse({ title: 'Toast', prepMinutes: -1 }).success, false)
})

it('stringifies the three JSON columns at the write boundary', () => {
  const row = toMealData(mealInput.parse({
    title: 'Toast',
    ingredients: [{ foodId: 1, quantity: 2, measure: 'slice' }],
    steps: ['Toast it.'],
    stages: [{ name: 'Toast', seconds: 120 }],
  }))
  assert.equal(typeof row.ingredients, 'string')
  assert.equal(typeof row.steps, 'string')
  assert.equal(typeof row.stages, 'string')
  assert.equal(JSON.parse(row.ingredients)[0].foodId, 1)
  assert.equal(row.title, 'Toast', 'scalar columns pass through')
})

// ── importSchema: the agent trust boundary ──────────────────────────────────

it('accepts a well-formed agent import', () => {
  const parsed = importSchema.parse(validImport)
  assert.equal(parsed.name, 'Arrachera')
  assert.deepEqual(parsed.categories, [], 'optional collections default to empty')
  assert.equal(parsed.servings, 1)
})

it('accepts only a real URL or an in-app image path', () => {
  // The union exists so an agent can hand back either an og:image it scraped or a path from
  // upload_frame. Anything else would be written into an <img src> as-is.
  const withImage = (image: unknown) => importSchema.safeParse({ ...validImport, image })

  assert.equal(withImage('https://example.test/a.jpg').success, true)
  assert.equal(withImage('/api/images/abc123.jpg').success, true)

  // A bare z.url() accepts every scheme, so each of these once validated as "a valid URL".
  assert.equal(withImage('javascript:alert(1)').success, false, 'a script URL is not an image')
  assert.equal(withImage('data:text/html,<script>alert(1)</script>').success, false, 'nor is a data URI')
  assert.equal(withImage('file:///etc/passwd').success, false, 'nor is a local file')
  assert.equal(withImage('/etc/passwd').success, false, 'an arbitrary path is not an image path')
  assert.equal(withImage('/api/images/../../etc/passwd').success, true,
    'NOTE: the prefix regex is not a traversal check — /api/images/[name] regex-validates the name it serves')
  assert.equal(withImage('').success, false, 'image is required')
  assert.equal(withImage(undefined).success, false)
  assert.equal(withImage('example.test/a.jpg').success, false, 'a bare host is not a URL')
})

it('requires the totals a meal card renders', () => {
  for (const key of ['calories', 'protein', 'carbs', 'fats']) {
    const missing = { ...validImport } as Record<string, unknown>
    delete missing[key]
    assert.equal(importSchema.safeParse(missing).success, false, `${key} is required`)
    assert.equal(importSchema.safeParse({ ...validImport, [key]: -1 }).success, false, `${key} cannot be negative`)
  }
  assert.equal(importSchema.safeParse({ ...validImport, calories: '600' }).success, false,
    'import totals are NOT coerced from strings — an agent sends real numbers')
})

it('refuses an import with nothing to cook', () => {
  assert.equal(importSchema.safeParse({ ...validImport, ingredients: [] }).success, false)
  assert.equal(importSchema.safeParse({ ...validImport, steps: [] }).success, false)
  assert.equal(importSchema.safeParse({ ...validImport, name: '  ' }).success, false)
})

it('takes ingredients as bare strings or as structured entries', () => {
  const mixed = importSchema.parse({
    ...validImport,
    ingredients: ['1 lime', { name: 'skirt steak', quantity: 200, unit: 'g', calories: 500 }],
  })
  assert.equal(typeof mixed.ingredients[0], 'string')
  assert.equal((mixed.ingredients[1] as { name: string }).name, 'skirt steak')

  assert.equal(importIngredient.parse({ name: 'lime' }).quantity, 1, 'quantity defaults to one')
  assert.equal(importIngredient.safeParse({ name: '' }).success, false)
  assert.equal(importIngredient.safeParse({ name: 'lime', calories: -1 }).success, false)
})

it('rejects a stage that indexes past the ingredients in the same payload', () => {
  // The superRefine is what ties stages to the array they were authored against. Without it
  // an agent's off-by-one paints the cook-mode chart over rows nobody sent.
  const bad = importSchema.safeParse({
    ...validImport,
    stages: [{ name: 'Sear', from: 0, to: 5 }],   // only 2 ingredients above
  })
  assert.equal(bad.success, false)
  assert.match(bad.error!.issues[0].message, /claims ingredient 5 but only 2 were sent/)
  assert.deepEqual(bad.error!.issues[0].path, ['stages'], 'the issue points at the field that is wrong')

  const ok = importSchema.safeParse({ ...validImport, stages: [{ name: 'Sear', from: 0, to: 1 }] })
  assert.equal(ok.success, true, 'the last valid row is accepted')
})
