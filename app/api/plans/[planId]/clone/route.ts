import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params

  // Get source plan
  const source = await prisma.weeklyPlan.findUnique({
    where: { id: Number(planId) },
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
    where: { isActive: true },
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
          portionMultiplier: sourceMeal.portionMultiplier,
        }
      })
    }
  }

  return NextResponse.json({ cloned: true })
}
