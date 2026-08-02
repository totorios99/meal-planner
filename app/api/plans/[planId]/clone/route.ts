import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const userId = await requireUserId(request)
  const { planId } = await params

  // Get source plan. findFirst, not findUnique, so the userId filter is part of the lookup —
  // someone else's plan id reads as "not found" rather than being cloned into your week.
  const source = await prisma.weeklyPlan.findFirst({
    where: { id: Number(planId), userId },
    include: {
      days: {
        include: {
          meals: { orderBy: { slotIndex: 'asc' } }
        }
      }
    }
  })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get active plan
  const active = await prisma.weeklyPlan.findFirst({
    where: { userId, isActive: true },
    include: { days: true }
  })
  if (!active) return NextResponse.json({ error: 'No active plan' }, { status: 400 })

  // For each day in source, copy meals to matching day in active plan
  for (const sourceDay of source.days) {
    const targetDay = active.days.find(d => d.dayIndex === sourceDay.dayIndex)
    if (!targetDay) continue

    // Clear existing meals in target day
    await prisma.weeklyPlanMeal.deleteMany({ where: { weeklyPlanDayId: targetDay.id } })

    // Copy meals
    for (const sourceMeal of sourceDay.meals) {
      await prisma.weeklyPlanMeal.create({
        data: {
          weeklyPlanDayId: targetDay.id,
          mealId: sourceMeal.mealId,
          slotIndex: sourceMeal.slotIndex,
          // Carry the per-placement ingredient snapshot so the clone is independently editable
          ingredients: sourceMeal.ingredients,
        }
      })
    }
  }

  return NextResponse.json({ cloned: true })
}
