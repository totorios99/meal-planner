/**
 * What every route does when nobody is signed in.
 *
 * The answer should be 401 everywhere. It is currently 500 on most of them: `requireUserId`
 * throws `Unauthorized`, and only two handlers catch it. In production `proxy.ts` 401s
 * `/api/*` before a handler runs, which masks this — but the comment in proxy.ts records
 * that Clerk's middleware detection fails intermittently ("auth() was called but Clerk can't
 * detect usage of clerkMiddleware()"), and that is exactly when these fire.
 *
 * A 500 is worse than a 401 for two reasons: the client cannot tell "sign in again" from
 * "the server is broken", and an unhandled throw leaks a stack trace into the logs on a path
 * an unauthenticated caller controls.
 */
import { describe, expect, it } from 'vitest'
import { GET as getFoods, POST as postFoods } from '@/app/api/foods/route'
import { PUT as putFood, DELETE as deleteFood } from '@/app/api/foods/[id]/route'
import { GET as getMeals, POST as postMeals } from '@/app/api/meals/route'
import { GET as getMeal, PUT as putMeal, PATCH as patchMeal, DELETE as deleteMeal } from '@/app/api/meals/[id]/route'
import { GET as getActive } from '@/app/api/plans/active/route'
import { GET as getHistory } from '@/app/api/plans/history/route'
import { POST as postClone } from '@/app/api/plans/[planId]/clone/route'
import { PATCH as patchDay } from '@/app/api/plans/[planId]/days/[dayId]/route'
import { POST as postDayMeal } from '@/app/api/plans/[planId]/days/[dayId]/meals/route'
import { POST as postReorder } from '@/app/api/plans/[planId]/days/[dayId]/meals/reorder/route'
import { PUT as putPlanMeal, DELETE as deletePlanMeal } from '@/app/api/plans/[planId]/days/[dayId]/meals/[mealEntryId]/route'
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/settings/route'
import { GET as getImage } from '@/app/api/images/[name]/route'
import { prisma } from '@/lib/prisma'
import { seeded, ALICE, WEEK_START, type Fixture } from '../setup/api.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, ctx?: any) => Promise<Response>

const get = (url: string) => new Request(url)
const send = (url: string, method: string, body?: unknown) =>
  new Request(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const BASE = 'https://mise.test'

/**
 * Every handler, with a request shaped well enough that only auth can reject it.
 *
 * Each case is a function of the fixture rather than a closure over it: this list is built at
 * collection time, and the rows are seeded per test in beforeEach, so the ids do not exist yet.
 */
function cases(): { name: string; run: (a: Fixture) => Promise<Response> }[] {
  const p = (o: Record<string, string>) => ({ params: Promise.resolve(o) })
  const call = (h: Handler, req: (a: Fixture) => Request, ctx?: (a: Fixture) => unknown) =>
    (a: Fixture) => h(req(a), ctx?.(a))

  return [
    { name: 'GET /api/foods', run: call(getFoods, () => get(`${BASE}/api/foods`)) },
    { name: 'POST /api/foods', run: call(postFoods, () => send(`${BASE}/api/foods`, 'POST', { name: 'Oats' })) },
    { name: 'PUT /api/foods/[id]', run: call(putFood, a => send(`${BASE}/api/foods/${a.foodId}`, 'PUT', { name: 'Oats' }), a => p({ id: String(a.foodId) })) },
    { name: 'DELETE /api/foods/[id]', run: call(deleteFood, a => send(`${BASE}/api/foods/${a.foodId}`, 'DELETE'), a => p({ id: String(a.foodId) })) },

    { name: 'GET /api/meals', run: call(getMeals, () => get(`${BASE}/api/meals`)) },
    { name: 'POST /api/meals', run: call(postMeals, () => send(`${BASE}/api/meals`, 'POST', { title: 'Toast' })) },
    { name: 'GET /api/meals/[id]', run: call(getMeal, a => get(`${BASE}/api/meals/${a.mealId}`), a => p({ id: String(a.mealId) })) },
    { name: 'PUT /api/meals/[id]', run: call(putMeal, a => send(`${BASE}/api/meals/${a.mealId}`, 'PUT', { title: 'Toast' }), a => p({ id: String(a.mealId) })) },
    { name: 'PATCH /api/meals/[id]', run: call(patchMeal, a => send(`${BASE}/api/meals/${a.mealId}`, 'PATCH', { isFavorite: true }), a => p({ id: String(a.mealId) })) },
    { name: 'DELETE /api/meals/[id]', run: call(deleteMeal, a => send(`${BASE}/api/meals/${a.mealId}`, 'DELETE'), a => p({ id: String(a.mealId) })) },

    { name: 'GET /api/plans/active', run: call(getActive, () => get(`${BASE}/api/plans/active?weekStart=${WEEK_START}`)) },
    { name: 'GET /api/plans/history', run: call(getHistory, () => get(`${BASE}/api/plans/history?before=${WEEK_START}`)) },
    { name: 'POST /api/plans/[planId]/clone', run: call(postClone, a => send(`${BASE}/api/plans/${a.planId}/clone`, 'POST', { targetPlanId: a.planId }), a => p({ planId: String(a.planId) })) },
    { name: 'PATCH /api/plans/[planId]/days/[dayId]', run: call(patchDay, a => send(`${BASE}/api/plans/${a.planId}/days/${a.dayId}`, 'PATCH', { isDismissed: true }), a => p({ planId: String(a.planId), dayId: String(a.dayId) })) },
    { name: 'POST .../days/[dayId]/meals', run: call(postDayMeal, a => send(`${BASE}/api/plans/${a.planId}/days/${a.dayId}/meals`, 'POST', { mealId: a.mealId, slotIndex: 1 }), a => p({ planId: String(a.planId), dayId: String(a.dayId) })) },
    { name: 'POST .../meals/reorder', run: call(postReorder, a => send(`${BASE}/api/plans/${a.planId}/days/${a.dayId}/meals/reorder`, 'POST', [{ id: a.planMealId, slotIndex: 0 }])) },
    { name: 'PUT .../meals/[mealEntryId]', run: call(putPlanMeal, a => send(`${BASE}/api/plans/${a.planId}/days/${a.dayId}/meals/${a.planMealId}`, 'PUT', { ingredients: [] }), a => p({ planId: String(a.planId), dayId: String(a.dayId), mealEntryId: String(a.planMealId) })) },
    { name: 'DELETE .../meals/[mealEntryId]', run: call(deletePlanMeal, a => send(`${BASE}/api/plans/${a.planId}/days/${a.dayId}/meals/${a.planMealId}`, 'DELETE'), a => p({ planId: String(a.planId), dayId: String(a.dayId), mealEntryId: String(a.planMealId) })) },

    { name: 'GET /api/settings', run: call(getSettings, () => get(`${BASE}/api/settings`)) },
    { name: 'PATCH /api/settings', run: call(patchSettings, () => send(`${BASE}/api/settings`, 'PATCH', { calories: 2000 })) },

    { name: 'GET /api/images/[name]', run: call(getImage, () => get(`${BASE}/api/images/abc123.jpg`), () => p({ name: 'abc123.jpg' })) },
  ]
}

describe('every route answers a signed-out caller with 401', () => {
  // `actAs(null)` is the default from the setup file, so nothing here signs in.
  for (const { name, run } of cases()) {
    it(name, async () => {
      let res: Response
      try {
        res = await run(seeded[ALICE])
      } catch (err) {
        // An uncaught throw IS the 500: Next turns it into one. Report it as such rather
        // than letting the test fail with an opaque stack.
        throw new Error(`${name} threw instead of returning 401 — Next renders this as a 500: ${err}`)
      }
      expect(res.status, `${name} should answer 401, not ${res.status}`).toBe(401)
    })
  }
})

describe('a signed-out request writes nothing', () => {
  // Both of these routes create rows as a side effect of a GET, so "it returned an error"
  // is not sufficient — the row must not exist either.

  it('GET /api/settings does not upsert a Settings row for nobody', async () => {
    const before = await prisma.settings.count()
    await getSettings(get(`${BASE}/api/settings`) as never).catch(() => null)
    expect(await prisma.settings.count()).toBe(before)
  })

  it('GET /api/plans/active does not create a plan for nobody', async () => {
    const before = await prisma.weeklyPlan.count()
    await getActive(get(`${BASE}/api/plans/active?weekStart=${WEEK_START}`) as never).catch(() => null)
    expect(await prisma.weeklyPlan.count()).toBe(before)
  })
})
