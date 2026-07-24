import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseRefs, foodsMap, resolvePlaceholders } from '@/lib/recipe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) {
  const { dayId } = await params
  const body = await request.json()
  const meal = await prisma.meal.findUnique({ where: { id: Number(body.mealId) } })
  if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })

  const rawRefs = parseRefs(meal.ingredients)
  const foods = rawRefs.length ? await prisma.food.findMany({ where: { id: { in: rawRefs.map(r => r.foodId) } } }) : []
  const { refs, placeholderNames } = resolvePlaceholders(rawRefs, foodsMap(foods))

  const entry = await prisma.weeklyPlanMeal.create({
    data: {
      weeklyPlanDayId: Number(dayId),
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
