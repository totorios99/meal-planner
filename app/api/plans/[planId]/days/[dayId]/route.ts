import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, findOwnedDay } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) {
  const userId = await requireUserId(request)
  const { dayId } = await params
  // WeeklyPlanDay has no userId of its own — ownership comes from the plan it cascades from,
  // so the path id is checked against that rather than trusted.
  const owned = await findOwnedDay(Number(dayId), userId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const day = await prisma.weeklyPlanDay.update({
    where: { id: owned.id },
    data: {
      ...(body.isDismissed !== undefined && { isDismissed: body.isDismissed }),
      ...(body.justification !== undefined && { justification: body.justification }),
    },
    include: {
      meals: {
        orderBy: { slotIndex: 'asc' },
        include: { meal: true }
      }
    }
  })
  return NextResponse.json(day)
}
