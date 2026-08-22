// Proves the harness itself works before any suite relies on it: a real route handler
// imported and invoked, against a real SQLite file built by the real migrations, with the
// acting user chosen per test.
import { expect, it } from 'vitest'
import { GET as getMeals } from '@/app/api/meals/route'
import { prisma } from '@/lib/prisma'
import { ALICE, BOB, seeded } from '../setup/api.ts'
import { actAs } from '../setup/clerk.ts'

const req = (url = 'https://mise.test/api/meals') => new Request(url) as never

it('runs against the throwaway database, never the dev one', () => {
  expect(process.env.DATABASE_URL).toContain('.test-db')
})

it('applied the real migrations, including the JS-only data steps', async () => {
  // prisma migrate deploy would not have produced this schema — 8 of the 20 migrations are
  // JS-only. If scripts/migrate.js were skipped, these columns would not exist.
  const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  )
  const tables = rows.map(r => r.name)
  for (const t of ['Meal', 'Food', 'WeeklyPlan', 'WeeklyPlanDay', 'WeeklyPlanMeal', 'Settings']) {
    expect(tables).toContain(t)
  }
})

it('seeds both tenants fresh for every test', async () => {
  expect(seeded[ALICE].mealId).toBeGreaterThan(0)
  expect(seeded[BOB].mealId).toBeGreaterThan(0)
  expect(seeded[ALICE].mealId).not.toBe(seeded[BOB].mealId)
  expect(await prisma.meal.count()).toBe(3)
})

it('invokes a real route handler as the user the test chose', async () => {
  actAs(ALICE)
  const res = await getMeals(req())
  expect(res.status).toBe(200)

  const meals = await res.json()
  expect(meals).toHaveLength(1)
  expect(meals[0].id).toBe(seeded[ALICE].mealId)
  expect(meals[0].title).toContain(ALICE)
})
