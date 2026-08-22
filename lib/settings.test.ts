// Self-check for the settings trust boundary. Run: npm test
// The two things worth guarding are the ones that silently corrupt the UI rather than throwing —
// a target of 0 (every planner bar divides by zero) and an off-union enum reaching the CSS.
import { it } from 'vitest'
import assert from 'node:assert/strict'
import { settingsPatch, coerceRow, DEFAULTS } from './settings.ts'
import { startOfWeek, toDateParam } from './date.ts'

it('settingsPatch rejects what would break the planner', () => {
  assert.equal(settingsPatch.safeParse({ calories: 0 }).success, false, 'zero calories must be rejected')
  assert.equal(settingsPatch.safeParse({ protein: -1 }).success, false, 'negative macro must be rejected')
  assert.equal(settingsPatch.safeParse({ fats: 'nope' }).success, false, 'non-numeric macro must be rejected')
  assert.equal(settingsPatch.safeParse({ units: 'stones' }).success, false, 'off-union unit must be rejected')
  assert.equal(settingsPatch.safeParse({ theme: 'sepia' }).success, false, 'off-union theme must be rejected')
  assert.equal(settingsPatch.safeParse({ weekStartsOn: 2 }).success, false, 'only Sunday/Monday start the week')
})

it('and accepts a single-key patch, which is all the autosaving UI ever sends', () => {
  assert.deepEqual(settingsPatch.parse({ recipeView: 'list' }), { recipeView: 'list' })
  assert.deepEqual(settingsPatch.parse({ calories: '2200' }), { calories: 2200 }, 'numeric strings coerce')
  assert.deepEqual(settingsPatch.parse({}), {}, 'empty patch is a no-op, not an error')
  assert.deepEqual(settingsPatch.parse({ nope: 1 }), {}, 'unknown keys are dropped, not stored')
})

it('coerceRow falls back per field, so one bad column can\'t take out the page', () => {
  assert.deepEqual(
    coerceRow({ calories: null, protein: 175, carbs: 270, fats: 80, recipeView: 'wat', units: 'US', theme: 'dark', plannerFullTitles: 1, weekStartsOn: 7 }),
    { ...DEFAULTS, protein: 175, theme: 'dark', plannerFullTitles: true },
    'bad fields fall back to DEFAULTS, good ones survive'
  )

  // A stored 0 is a real value, not a falsy accident — Sunday must survive coerceRow.
  assert.equal(coerceRow({ ...DEFAULTS, weekStartsOn: 0 }).weekStartsOn, 0, 'Sunday start round-trips')
})

it('startOfWeek lands on the right day for both preferences', () => {
  // Including the Sunday edge case.
  const sunday = new Date(2026, 6, 26) // Sun 26 Jul 2026
  assert.equal(toDateParam(startOfWeek(1, 0, sunday)), '2026-07-20', 'Monday-start week containing a Sunday starts 6 days back')
  assert.equal(toDateParam(startOfWeek(0, 0, sunday)), '2026-07-26', 'Sunday-start week containing a Sunday starts today')
  assert.equal(toDateParam(startOfWeek(0, 1, sunday)), '2026-08-02', 'offset shifts whole weeks')
  assert.equal(toDateParam(startOfWeek(1, 0, new Date(2026, 6, 30))), '2026-07-27', 'midweek resolves to its Monday')
})
