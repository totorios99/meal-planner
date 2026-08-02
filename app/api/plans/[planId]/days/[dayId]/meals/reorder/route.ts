import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request)
  const entries: { id: number; slotIndex: number }[] = await request.json()
  // updateMany rather than update: the ownership filter rides along in the same statement, so
  // an id belonging to someone else's plan matches nothing instead of being reordered. (This
  // route takes its ids from the body and never looked at the dayId in its own path.)
  await prisma.$transaction(
    entries.map(({ id, slotIndex }) =>
      prisma.weeklyPlanMeal.updateMany({
        where: { id, weeklyPlanDay: { weeklyPlan: { userId } } },
        data: { slotIndex },
      })
    )
  )
  return NextResponse.json({ ok: true })
}
