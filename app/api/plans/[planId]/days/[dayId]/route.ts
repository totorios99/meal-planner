import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) {
  const { dayId } = await params
  const body = await request.json()
  const day = await prisma.weeklyPlanDay.update({
    where: { id: Number(dayId) },
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
