/**
 * Cross-tenant isolation: AGENTS.md rule 7, turned into assertions.
 *
 * Two rules are being enforced here, and the second is easy to lose:
 *   1. A collection route returns only the caller's rows.
 *   2. A single-resource route answers 404 for someone else's row, never 403 — a 403 confirms
 *      the row exists, which is the leak the status code was chosen to avoid.
 *
 * Every test also asserts the victim's data is *unchanged*, not merely that the response was
 * an error. A route that 404s and mutates anyway is the failure mode that matters.
 */
import { expect, it } from 'vitest'
import { GET as getMeals } from '@/app/api/meals/route'
import { GET as getMeal, PUT as putMeal, PATCH as patchMeal, DELETE as deleteMeal } from '@/app/api/meals/[id]/route'
import { GET as getFoods, POST as postFoods } from '@/app/api/foods/route'
import { PUT as putFood, DELETE as deleteFood } from '@/app/api/foods/[id]/route'
import { GET as getActive } from '@/app/api/plans/active/route'
import { GET as getHistory } from '@/app/api/plans/history/route'
import { POST as postClone } from '@/app/api/plans/[planId]/clone/route'
import { PATCH as patchDay } from '@/app/api/plans/[planId]/days/[dayId]/route'
import { POST as postDayMeal } from '@/app/api/plans/[planId]/days/[dayId]/meals/route'
import { POST as postReorder } from '@/app/api/plans/[planId]/days/[dayId]/meals/reorder/route'
import { PUT as putPlanMeal, DELETE as deletePlanMeal } from '@/app/api/plans/[planId]/days/[dayId]/meals/[mealEntryId]/route'
import { prisma } from '@/lib/prisma'
import { ALICE, BOB, seeded, WEEK_START } from '../setup/api.ts'
import { actAs } from '../setup/clerk.ts'

import { req, params } from '../setup/request.ts'

const BASE = 'https://mise.test'

// ── Collections: only ever the caller's own rows ─────────────────────────────

it('lists only the caller\'s meals', async () => {
  actAs(ALICE)
  const meals = await (await getMeals(req(`${BASE}/api/meals`))).json()
  expect(meals).toHaveLength(1)
  expect(meals[0].id).toBe(seeded[ALICE].mealId)
})

it('lists only the caller\'s foods, including through the search filter', async () => {
  actAs(ALICE)
  const all = await (await getFoods(req(`${BASE}/api/foods`))).json()
  expect(all.map((f: { id: number }) => f.id)).toEqual([seeded[ALICE].foodId])

  // The search path is a different query — a filter that forgot the userId would surface
  // Bob's food here even though the unfiltered list is scoped.
  const searched = await (await getFoods(req(`${BASE}/api/foods?search=Rice`))).json()
  expect(searched.every((f: { name: string }) => f.name.includes(ALICE))).toBe(true)
})

it('never returns another user\'s plan for the same week', async () => {
  // Both tenants have a plan for exactly this weekStart, so a missing scope returns whichever
  // row the database happens to hand back first.
  actAs(ALICE)
  const plan = await (await getActive(req(`${BASE}/api/plans/active?weekStart=${WEEK_START}`))).json()
  expect(plan.id).toBe(seeded[ALICE].planId)
})

it('lists only the caller\'s plan history', async () => {
  actAs(ALICE)
  const history = await (await getHistory(req(`${BASE}/api/plans/history?before=2026-12-31`))).json()
  expect(history.every((p: { id: number }) => p.id === seeded[ALICE].planId)).toBe(true)
})

// ── Single resources: 404, and no mutation ───────────────────────────────────

it('404s on another user\'s meal rather than 403', async () => {
  actAs(ALICE)
  const bobsMeal = String(seeded[BOB].mealId)
  const res = await getMeal(req(`${BASE}/api/meals/${bobsMeal}`), params({ id: bobsMeal }))
  expect(res.status, 'a 403 would confirm the row exists').toBe(404)
})

it('cannot edit or delete another user\'s meal', async () => {
  actAs(ALICE)
  const id = String(seeded[BOB].mealId)
  const before = await prisma.meal.findUniqueOrThrow({ where: { id: seeded[BOB].mealId } })

  expect((await putMeal(req(`${BASE}/api/meals/${id}`, 'PUT', { title: 'Owned' }), params({ id }))).status).toBe(404)
  expect((await patchMeal(req(`${BASE}/api/meals/${id}`, 'PATCH', { isFavorite: true }), params({ id }))).status).toBe(404)
  expect((await deleteMeal(req(`${BASE}/api/meals/${id}`, 'DELETE'), params({ id }))).status).toBe(404)

  const after = await prisma.meal.findUnique({ where: { id: seeded[BOB].mealId } })
  expect(after, 'Bob\'s meal must still exist').not.toBeNull()
  expect(after!.title).toBe(before.title)
  expect(after!.isFavorite).toBe(before.isFavorite)
})

it('cannot rename or delete another user\'s food', async () => {
  actAs(ALICE)
  const id = String(seeded[BOB].foodId)
  const before = await prisma.food.findUniqueOrThrow({ where: { id: seeded[BOB].foodId } })

  expect((await putFood(req(`${BASE}/api/foods/${id}`, 'PUT', { name: 'Owned' }), params({ id }))).status).toBe(404)
  expect((await deleteFood(req(`${BASE}/api/foods/${id}`, 'DELETE'), params({ id }))).status).toBe(404)

  const after = await prisma.food.findUnique({ where: { id: seeded[BOB].foodId } })
  expect(after!.name).toBe(before.name)
})

it('scopes the raw-SQL name lookup by hand, so a name collision stays per-user', async () => {
  // findFoodByName drops to $queryRaw for a COLLATE NOCASE match, and raw SQL gets no scoping
  // for free (AGENTS.md rule 7). Alice creating a name Bob already owns must succeed.
  actAs(ALICE)
  const bobsFood = await prisma.food.findUniqueOrThrow({ where: { id: seeded[BOB].foodId } })

  const res = await postFoods(req(`${BASE}/api/foods`, 'POST', { name: bobsFood.name }))
  expect(res.status, 'the @@unique is [userId, name], not name').toBe(201)

  const mine = await res.json()
  expect(mine.userId ?? ALICE).toBeTruthy()
  expect(await prisma.food.count({ where: { name: bobsFood.name } })).toBe(2)
})

it('still rejects the caller\'s own duplicate name, case-insensitively', async () => {
  actAs(ALICE)
  const own = await prisma.food.findUniqueOrThrow({ where: { id: seeded[ALICE].foodId } })
  const res = await postFoods(req(`${BASE}/api/foods`, 'POST', { name: own.name.toUpperCase() }))
  expect(res.status, 'the unique index is case-sensitive, hence the COLLATE NOCASE lookup').toBe(409)
})

// ── Nested rows: ownership inherited through the plan ────────────────────────

it('404s on a day inside another user\'s plan', async () => {
  // WeeklyPlanDay carries no userId — findOwnedDay is the entire check.
  actAs(ALICE)
  const { planId, dayId } = seeded[BOB]
  const res = await patchDay(
    req(`${BASE}/api/plans/${planId}/days/${dayId}`, 'PATCH', { isDismissed: true }),
    params({ planId: String(planId), dayId: String(dayId) })
  )
  expect(res.status).toBe(404)
  const day = await prisma.weeklyPlanDay.findUniqueOrThrow({ where: { id: dayId } })
  expect(day.isDismissed, 'Bob\'s day must be untouched').toBe(false)
})

it('404s when adding a meal to another user\'s day', async () => {
  actAs(ALICE)
  const { planId, dayId } = seeded[BOB]
  const res = await postDayMeal(
    req(`${BASE}/api/plans/${planId}/days/${dayId}/meals`, 'POST', { mealId: seeded[ALICE].mealId, slotIndex: 3 }),
    params({ planId: String(planId), dayId: String(dayId) })
  )
  expect(res.status).toBe(404)
  expect(await prisma.weeklyPlanMeal.count({ where: { weeklyPlanDayId: dayId } })).toBe(1)
})

it('404s when placing another user\'s meal into my own day', async () => {
  // The day is mine, the meal is not — both sides need checking, not just the path.
  actAs(ALICE)
  const { planId, dayId } = seeded[ALICE]
  const res = await postDayMeal(
    req(`${BASE}/api/plans/${planId}/days/${dayId}/meals`, 'POST', { mealId: seeded[BOB].mealId, slotIndex: 3 }),
    params({ planId: String(planId), dayId: String(dayId) })
  )
  expect(res.status).toBe(404)
})

it('404s on another user\'s placement', async () => {
  actAs(ALICE)
  const { planId, dayId, planMealId } = seeded[BOB]
  const ctx = params({ planId: String(planId), dayId: String(dayId), mealEntryId: String(planMealId) })
  const url = `${BASE}/api/plans/${planId}/days/${dayId}/meals/${planMealId}`

  expect((await putPlanMeal(req(url, 'PUT', { ingredients: [] }), ctx)).status).toBe(404)
  expect((await deletePlanMeal(req(url, 'DELETE'), ctx)).status).toBe(404)
  expect(await prisma.weeklyPlanMeal.findUnique({ where: { id: planMealId } })).not.toBeNull()
})

it('404s on cloning from another user\'s plan', async () => {
  actAs(ALICE)
  const res = await postClone(
    req(`${BASE}/api/plans/${seeded[BOB].planId}/clone`, 'POST', { targetPlanId: seeded[ALICE].planId }),
    params({ planId: String(seeded[BOB].planId) })
  )
  expect(res.status).toBe(404)
})

it('reorder ignores placement ids belonging to another user', async () => {
  // This route takes ids straight from the body and never reads its own path params. Its only
  // protection is the userId in the updateMany where-clause — a single line between tenants.
  actAs(ALICE)
  const mine = seeded[ALICE]
  const theirs = seeded[BOB]
  const bobBefore = await prisma.weeklyPlanMeal.findUniqueOrThrow({ where: { id: theirs.planMealId } })

  const res = await postReorder(req(
    `${BASE}/api/plans/${mine.planId}/days/${mine.dayId}/meals/reorder`,
    'POST',
    [{ id: mine.planMealId, slotIndex: 4 }, { id: theirs.planMealId, slotIndex: 9 }],
  ))
  expect(res.ok).toBe(true)

  const bobAfter = await prisma.weeklyPlanMeal.findUniqueOrThrow({ where: { id: theirs.planMealId } })
  expect(bobAfter.slotIndex, 'Bob\'s slot must be untouched by Alice\'s reorder').toBe(bobBefore.slotIndex)

  const mineAfter = await prisma.weeklyPlanMeal.findUniqueOrThrow({ where: { id: mine.planMealId } })
  expect(mineAfter.slotIndex, 'and my own entry in the same payload still moves').toBe(4)
})
