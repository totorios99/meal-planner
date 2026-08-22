import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, guarded } from '@/lib/auth'

export const POST = guarded(async (
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) => {
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

  // The destination is the week the planner is *showing*, which is not necessarily the current
  // one: quick-filling while looking at next week used to copy into the current week instead,
  // so the grid you were staring at never changed and the feature read as dead. The client sends
  // the plan it has open, and it is required — this endpoint overwrites a week, and the old
  // fallback (the active plan) is what aimed it at the wrong one.
  const body = await request.json().catch(() => ({}))
  const targetId = Number(body?.targetPlanId)
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: 'targetPlanId required' }, { status: 400 })
  }
  const target = await prisma.weeklyPlan.findFirst({
    where: { id: targetId, userId },
    include: { days: true }
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // One transaction: the copy clears each target day before refilling it, so a failure halfway
  // through would otherwise leave the week partly wiped and partly stale.
  await prisma.$transaction(async tx => {
    for (const sourceDay of source.days) {
      const targetDay = target.days.find(d => d.dayIndex === sourceDay.dayIndex)
      if (!targetDay) continue

      await tx.weeklyPlanMeal.deleteMany({ where: { weeklyPlanDayId: targetDay.id } })

      for (const sourceMeal of sourceDay.meals) {
        await tx.weeklyPlanMeal.create({
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
  })

  return NextResponse.json({ cloned: true })
})
