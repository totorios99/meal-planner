import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) {
  const { dayId } = await params
  const body = await request.json()
  const entry = await prisma.weeklyPlanMeal.create({
    data: {
      weeklyPlanDayId: Number(dayId),
      mealId: Number(body.mealId),
      slotIndex: Number(body.slotIndex),
      portionMultiplier: body.portionMultiplier ?? 1.0,
    },
    include: { meal: true }
  })
  return NextResponse.json(entry, { status: 201 })
}
