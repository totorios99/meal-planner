import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseRefs, foodsMap, resolvePlaceholders } from '@/lib/recipe'
import { requireUserId, findOwnedDay } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) {
  const userId = await requireUserId(request)
  const { dayId } = await params
  const day = await findOwnedDay(Number(dayId), userId)
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  // Both the day and the meal have to be yours — otherwise this endpoint would happily place
  // someone else's recipe (and its ingredient snapshot) into your week.
  const meal = await prisma.meal.findFirst({ where: { id: Number(body.mealId), userId } })
  if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })

  const rawRefs = parseRefs(meal.ingredients)
  const foods = rawRefs.length ? await prisma.food.findMany({ where: { userId, id: { in: rawRefs.map(r => r.foodId) } } }) : []
  const { refs, placeholderNames } = resolvePlaceholders(rawRefs, foodsMap(foods))

  const entry = await prisma.weeklyPlanMeal.create({
    data: {
      weeklyPlanDayId: day.id,
      mealId: meal.id,
      slotIndex: Number(body.slotIndex),
      // Snapshot the meal's ingredients so this placement edits independently — placeholder refs
      // (e.g. "vegetables") are swapped for blank, unresolved slots (see resolvePlaceholders).
      ingredients: JSON.stringify(refs),
    },
    include: { meal: true }
  })
  const warnings = placeholderNames.map(
    name => `This meal uses a placeholder for "${name}" — an empty ingredient slot was added at the end for you to fill in`
  )
  return NextResponse.json({ ...entry, ...(warnings.length ? { warnings } : {}) }, { status: 201 })
}
