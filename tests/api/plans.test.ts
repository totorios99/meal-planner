/**
 * The create-on-read week route. It is the one GET in the app that writes, so getting the
 * week wrong does not just show the wrong page — it persists the wrong week.
 */
import { expect, it } from 'vitest'
import { GET as getActive } from '@/app/api/plans/active/route'
import { prisma } from '@/lib/prisma'
import { ALICE, seeded, WEEK_START } from '../setup/api.ts'
import { actAs } from '../setup/clerk.ts'
import { req } from '../setup/request.ts'

const BASE = 'https://mise.test'

it('returns the existing plan for an explicit week rather than making another', async () => {
  actAs(ALICE)
  const res = await getActive(req(`${BASE}/api/plans/active?weekStart=${WEEK_START}`))
  const plan = await res.json()
  expect(plan.id).toBe(seeded[ALICE].planId)
  expect(await prisma.weeklyPlan.count({ where: { userId: ALICE } })).toBe(1)
})

it('creates a week of exactly seven days, indexed 0 to 6', async () => {
  actAs(ALICE)
  const plan = await (await getActive(req(`${BASE}/api/plans/active?weekStart=2026-09-07`))).json()
  expect(plan.days).toHaveLength(7)
  expect(plan.days.map((d: { dayIndex: number }) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6])
})

it('does not mint a second plan when called twice for the same week', async () => {
  // The @@unique([userId, weekStart]) plus the P2002 catch is what makes a GET that writes
  // safe: the home page and the planner both fire this on mount, and they used to race and
  // leave duplicate rows (production carried three for one week).
  actAs(ALICE)
  const [a, b] = await Promise.all([
    getActive(req(`${BASE}/api/plans/active?weekStart=2026-09-14`)),
    getActive(req(`${BASE}/api/plans/active?weekStart=2026-09-14`)),
  ])
  expect(a.status).toBe(200)
  expect(b.status).toBe(200)
  expect(await prisma.weeklyPlan.count({ where: { userId: ALICE, weekStart: new Date(2026, 8, 14) } })).toBe(1)
})

it('honours the caller\'s week-start preference when no week is given', async () => {
  // The fallback used to hardcode Monday and never read weekStartsOn, so a Sunday-start user
  // hitting this without a param did not merely *see* the wrong week — this route CREATES it.
  // Same family as the settings-reset incident that left a plan stranded in an invisible week.
  actAs(ALICE)
  await prisma.settings.upsert({
    where: { userId: ALICE },
    create: { userId: ALICE, weekStartsOn: 0 },
    update: { weekStartsOn: 0 },
  })

  const plan = await (await getActive(req(`${BASE}/api/plans/active`))).json()
  const created = new Date(plan.weekStart)
  expect(created.getDay(), 'a Sunday-start user must get a Sunday').toBe(0)
})

it('still starts on Monday for a Monday-start caller', async () => {
  actAs(ALICE)
  await prisma.settings.upsert({
    where: { userId: ALICE },
    create: { userId: ALICE, weekStartsOn: 1 },
    update: { weekStartsOn: 1 },
  })

  const plan = await (await getActive(req(`${BASE}/api/plans/active`))).json()
  expect(new Date(plan.weekStart).getDay()).toBe(1)
})
