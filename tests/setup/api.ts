import { beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetRateLimits } from '@/lib/rateLimit'
import { actAs } from './clerk.ts'

// Second line of defence. globalDb.ts already refused to build a database anywhere but
// `.test-db`, but the beforeEach below truncates six tables on every single test, so the
// check is repeated where the deleting actually happens. Do not simplify this away.
if (!process.env.DATABASE_URL?.includes('.test-db')) {
  throw new Error(`Refusing to run: DATABASE_URL is ${process.env.DATABASE_URL ?? '(unset)'}`)
}

/** Two tenants. BOB exists purely so every test starts with a victim already in the database. */
export const ALICE = 'user_alice'
export const BOB = 'user_bob'
/** Matches MISE_OWNER_USER_ID in vitest.config.mts — who an agent import acts as. */
export const OWNER = 'user_owner'

export interface Fixture {
  foodId: number
  mealId: number
  planId: number
  dayId: number
  planMealId: number
}

/** Ids for each tenant's seeded rows, refreshed before every test. */
export const seeded = {} as Record<string, Fixture>

/** A Monday, so it is a valid weekStart under either weekStartsOn preference. */
export const WEEK_START = '2026-08-10'

/**
 * The same day as a Date, at LOCAL midnight — which is how the app stores it.
 * `parseLocalDate` in plans/active builds the value from the browser-supplied `?weekStart`,
 * and the lookup is a [weekStart, +1 day) range, so a UTC-midnight row does not match for
 * anyone west of UTC. Seeding UTC midnight here silently made every plan lookup miss and
 * create a second plan instead.
 */
export const WEEK_START_DATE = new Date(2026, 7, 10)

async function seedFor(userId: string): Promise<Fixture> {
  const food = await prisma.food.create({
    data: {
      userId,
      name: `Rice (${userId})`,
      baseUnit: 'g',
      nutrients: JSON.stringify([
        { key: 'calories', label: 'Calories', unit: 'kcal', amount: 1.3, group: 'macro' },
        { key: 'protein_g', label: 'Protein', unit: 'g', amount: 0.024, group: 'macro' },
      ]),
      measures: JSON.stringify([{ unit: 'cup', perBase: 185 }]),
    },
  })

  const meal = await prisma.meal.create({
    data: {
      userId,
      title: `Rice bowl (${userId})`,
      calories: 130, protein: 2.4, carbs: 28, fats: 0.3,
      ingredients: JSON.stringify([{ foodId: food.id, quantity: 100, measure: 'g' }]),
      steps: JSON.stringify(['Cook the rice.']),
    },
  })

  const plan = await prisma.weeklyPlan.create({
    data: {
      userId,
      weekStart: WEEK_START_DATE,
      days: { create: Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex })) },
    },
    include: { days: true },
  })

  const day = plan.days.find(d => d.dayIndex === 0)!
  const planMeal = await prisma.weeklyPlanMeal.create({
    data: {
      weeklyPlanDayId: day.id,
      mealId: meal.id,
      slotIndex: 0,
      ingredients: JSON.stringify([{ foodId: food.id, quantity: 100, measure: 'g' }]),
    },
  })

  return { foodId: food.id, mealId: meal.id, planId: plan.id, dayId: day.id, planMealId: planMeal.id }
}

beforeEach(async () => {
  // Truncate child-first: WeeklyPlanDay/Meal cascade from their plan, but WeeklyPlanMeal
  // also references Meal with no cascade, so meals cannot go first.
  // Raw DELETEs rather than a transaction rollback: some routes open their own transactions
  // (plans/[planId]/clone), which cannot nest inside one wrapping the handler.
  await prisma.$executeRawUnsafe('DELETE FROM "WeeklyPlanMeal"')
  await prisma.$executeRawUnsafe('DELETE FROM "WeeklyPlanDay"')
  await prisma.$executeRawUnsafe('DELETE FROM "WeeklyPlan"')
  await prisma.$executeRawUnsafe('DELETE FROM "Meal"')
  await prisma.$executeRawUnsafe('DELETE FROM "Food"')
  await prisma.$executeRawUnsafe('DELETE FROM "Settings"')

  // The limiter is module-level state in a single-process run, so it survives between files
  // exactly as it does in production. Reset it explicitly rather than relying on isolation.
  resetRateLimits()
  // No ambient identity: every test states who it is acting as.
  actAs(null)

  seeded[ALICE] = await seedFor(ALICE)
  seeded[BOB] = await seedFor(BOB)
  seeded[OWNER] = await seedFor(OWNER)
})
