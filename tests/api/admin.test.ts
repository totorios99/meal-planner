/**
 * The agent trust boundary at the route level — AGENTS.md rules 2 and 4.
 *
 * `lib/adminSecret.test.ts` covers the comparison itself. This covers the thing that comparison
 * is for: an operational route must be reachable by a secret-holding agent and by nobody else,
 * *including* an ordinary signed-in human.
 */
import { expect, it } from 'vitest'
import { POST as postImport } from '@/app/api/meals/import/route'
import { prisma } from '@/lib/prisma'
import { ALICE, BOB, OWNER } from '../setup/api.ts'
import { actAs } from '../setup/clerk.ts'
import { req, agentReq, params } from '../setup/request.ts'
import { GET as getImage } from '@/app/api/images/[name]/route'

const URL = 'https://mise.test/api/meals/import'

const recipe = (over: Record<string, unknown> = {}) => ({
  name: 'Imported dish',
  image: 'https://example.test/dish.jpg',
  calories: 500, protein: 30, carbs: 40, fats: 20,
  ingredients: ['200g rice'],
  steps: ['Cook it.'],
  ...over,
})

it('imports for the owner when the secret is valid and there is no session', async () => {
  actAs(null)
  const res = await postImport(agentReq(URL, 'POST', recipe()))
  expect(res.status).toBe(201)

  const meal = await prisma.meal.findFirst({ where: { title: 'Imported dish' } })
  expect(meal, 'the import must land').not.toBeNull()
  expect(meal!.userId, 'an agent acts as MISE_OWNER_USER_ID').toBe(OWNER)
})

it('rejects a missing secret', async () => {
  actAs(null)
  const res = await postImport(req(URL, 'POST', recipe()))
  expect(res.status).toBe(401)
  expect(await prisma.meal.count({ where: { title: 'Imported dish' } })).toBe(0)
})

it('rejects a wrong secret', async () => {
  actAs(null)
  const r = req(URL, 'POST', recipe())
  r.headers.set('x-mise-admin-secret', 'not-the-secret')
  expect((await postImport(r)).status).toBe(401)
})

it('grants a signed-in human nothing on an operational route', async () => {
  // Rule 4. A Clerk session is not a substitute for the header — importing is not something
  // a regular user can trigger, no matter how legitimately they are signed in.
  actAs(ALICE)
  const res = await postImport(req(URL, 'POST', recipe()))
  expect(res.status).toBe(401)
  expect(await prisma.meal.count({ where: { title: 'Imported dish' } })).toBe(0)
})

it('imports as the owner even when a different user is signed in', async () => {
  // The secret decides who the row belongs to, not the ambient session. Otherwise an agent
  // call that happened to carry a stray cookie would write into the wrong tenant.
  actAs(BOB)
  const res = await postImport(agentReq(URL, 'POST', recipe()))
  expect(res.status).toBe(201)

  const meal = await prisma.meal.findFirstOrThrow({ where: { title: 'Imported dish' } })
  expect(meal.userId, 'owned by the agent owner, not by Bob').toBe(OWNER)
})

it('ignores a secret passed in the query string', async () => {
  // Rule 3: a URL ends up in access logs, proxy logs and browser history.
  actAs(null)
  const url = `${URL}?x-mise-admin-secret=${process.env.MISE_ADMIN_SECRET}`
  expect((await postImport(req(url, 'POST', recipe()))).status).toBe(401)
})

it('validates the payload before writing anything', async () => {
  actAs(null)
  const res = await postImport(agentReq(URL, 'POST', recipe({ ingredients: [] })))
  expect(res.status).toBe(400)
  expect(await prisma.meal.count({ where: { title: 'Imported dish' } })).toBe(0)
})

it('refuses a non-http image scheme at the route, not just in the schema', async () => {
  actAs(null)
  for (const image of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd']) {
    const res = await postImport(agentReq(URL, 'POST', recipe({ image })))
    expect(res.status, `${image} must not be accepted as a photo`).toBe(400)
  }
  const ok = await postImport(agentReq(URL, 'POST', recipe({ image: '/api/images/abc123.jpg' })))
  expect(ok.status, 'an in-app image path is fine').toBe(201)
})

it('serves an image to a secret-holding agent, and to nobody anonymous', async () => {
  // The guard added with the rate limiting accepts either credential, like the upload route.
  actAs(null)
  const anon = await getImage(req('https://mise.test/api/images/nope.jpg'), params({ name: 'nope.jpg' }))
  expect(anon.status).toBe(401)

  // A valid secret gets past auth — 404 because the file does not exist, which is the point:
  // it reached the filesystem lookup rather than being turned away at the door.
  const agent = await getImage(agentReq('https://mise.test/api/images/nope.jpg', 'GET'), params({ name: 'nope.jpg' }))
  expect(agent.status).toBe(404)
})

it('rejects a filename that is not a plain image name', async () => {
  actAs(ALICE)
  for (const name of ['../../etc/passwd', 'x.svg', 'a/b.jpg', 'x.jpg.exe', '.env']) {
    const res = await getImage(req(`https://mise.test/api/images/${name}`), params({ name }))
    expect(res.status, `${name} must not be served`).toBe(400)
  }
})

it('serves an authenticated image privately, never to a shared cache', async () => {
  // The response is authenticated now, so a `public` Cache-Control would let the reverse proxy
  // hand one user's photo to the next requester.
  actAs(ALICE)
  const res = await getImage(req('https://mise.test/api/images/nope.jpg'), params({ name: 'nope.jpg' }))
  expect(res.status).toBe(404)   // no such file, but it got past auth
  const hit = await getImage(req('https://mise.test/api/images/nope.jpg'), params({ name: 'nope.jpg' }))
  expect(hit.headers.get('Cache-Control') ?? '').not.toContain('public')
})
