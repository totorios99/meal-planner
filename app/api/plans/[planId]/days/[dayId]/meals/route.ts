import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) {
  const { dayId } = await params
  const body = await request.json()
  const meal = await prisma.meal.findUnique({ where: { id: Number(body.mealId) } })
  if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
  const entry = await prisma.weeklyPlanMeal.create({
    data: {
      weeklyPlanDayId: Number(dayId),
      mealId: meal.id,
      slotIndex: Number(body.slotIndex),
      // Snapshot the meal's ingredients so this placement edits independently
      ingredients: meal.ingredients,
    },
    include: { meal: true }
  })
  return NextResponse.json(entry, { status: 201 })
}
