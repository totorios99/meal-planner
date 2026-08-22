/**
 * The limiters at the route level. `lib/rateLimit.test.ts` covers the window arithmetic; this
 * covers it being wired to the right routes, with the right keys.
 *
 * Note the module-level counter in lib/rateLimit.ts is shared across every file in this
 * project — `isolate: false`, one process, exactly as production runs. `resetRateLimits()` in
 * the setup file is what keeps that from making the suite order-dependent.
 */
import { expect, it } from 'vitest'
import { POST as postImport } from '@/app/api/meals/import/route'
import { ALICE, OWNER } from '../setup/api.ts'
import { actAs } from '../setup/clerk.ts'
import { agentReq } from '../setup/request.ts'

const URL = 'https://mise.test/api/meals/import'
const recipe = (n: number) => ({
  name: `Imported ${n}`,
  image: 'https://example.test/dish.jpg',
  calories: 500, protein: 30, carbs: 40, fats: 20,
  ingredients: ['200g rice'],
  steps: ['Cook it.'],
})

it('the first request of this file is not already rate-limited', async () => {
  // This name looks trivial and is the most valuable assertion in the file: it is the only
  // thing that catches resetRateLimits() being dropped from the setup, which would otherwise
  // make the whole suite order-dependent and intermittently red.
  actAs(null)
  const res = await postImport(agentReq(URL, 'POST', recipe(0)))
  expect(res.status).not.toBe(429)
})

it('blocks the 11th import inside a minute, with a Retry-After', async () => {
  actAs(null)
  const codes: number[] = []
  for (let i = 1; i <= 11; i++) {
    codes.push((await postImport(agentReq(URL, 'POST', recipe(i)))).status)
  }
  expect(codes.slice(0, 10).every(c => c !== 429), 'the first ten are allowed through').toBe(true)
  expect(codes[10], 'the eleventh is refused').toBe(429)

  const blocked = await postImport(agentReq(URL, 'POST', recipe(99)))
  expect(blocked.status).toBe(429)
  const retry = Number(blocked.headers.get('Retry-After'))
  expect(retry, 'a client needs to know how long to wait').toBeGreaterThanOrEqual(1)
  expect(retry).toBeLessThanOrEqual(60)
})

it('counts a rejected payload against the limit too', async () => {
  // The limiter runs after auth and before validation on purpose: a loop of malformed
  // requests is still a loop, and must not be free.
  actAs(null)
  for (let i = 0; i < 10; i++) {
    await postImport(agentReq(URL, 'POST', { name: 'bad' }))   // 400, not 201
  }
  const res = await postImport(agentReq(URL, 'POST', recipe(1)))
  expect(res.status).toBe(429)
})

it('keys the window per acting user, not globally', async () => {
  // Every agent import acts as OWNER, so exhausting that window must not affect a key that
  // belongs to someone else. Asserted through the limiter directly — the import route has
  // only one possible identity, so the route cannot demonstrate this on its own.
  const { rateLimit, resetRateLimits } = await import('@/lib/rateLimit')
  resetRateLimits()
  for (let i = 0; i < 10; i++) rateLimit(`import:${OWNER}`, 10, 60_000)
  expect(rateLimit(`import:${OWNER}`, 10, 60_000).ok, 'owner is exhausted').toBe(false)
  expect(rateLimit(`import:${ALICE}`, 10, 60_000).ok, 'a different key is untouched').toBe(true)
})
