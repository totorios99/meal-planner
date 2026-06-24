import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const entries: { id: number; slotIndex: number }[] = await request.json()
  await prisma.$transaction(
    entries.map(({ id, slotIndex }) =>
      prisma.weeklyPlanMeal.update({ where: { id }, data: { slotIndex } })
    )
  )
  return NextResponse.json({ ok: true })
}
