import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mealEntryId: string }> }
) {
  const { mealEntryId } = await params
  const body = await request.json()
  const entry = await prisma.weeklyPlanMeal.update({
    where: { id: Number(mealEntryId) },
    data: { portionMultiplier: Number(body.portionMultiplier) },
    include: { meal: true }
  })
  return NextResponse.json(entry)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mealEntryId: string }> }
) {
  const { mealEntryId } = await params
  await prisma.weeklyPlanMeal.delete({ where: { id: Number(mealEntryId) } })
  return NextResponse.json({ deleted: true })
}
