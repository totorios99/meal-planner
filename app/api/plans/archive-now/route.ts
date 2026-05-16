import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getNextMonday(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function POST() {
  const active = await prisma.weeklyPlan.findFirst({ where: { isActive: true } })
  if (!active) return NextResponse.json({ error: 'No active plan' }, { status: 400 })

  await prisma.weeklyPlan.update({
    where: { id: active.id },
    data: { isActive: false, archivedAt: new Date() }
  })

  const nextMonday = getNextMonday()
  const newPlan = await prisma.weeklyPlan.create({
    data: { weekStart: nextMonday, isActive: true }
  })
  for (let i = 0; i < 7; i++) {
    await prisma.weeklyPlanDay.create({
      data: { weeklyPlanId: newPlan.id, dayIndex: i }
    })
  }

  return NextResponse.json({ archived: active.id, newPlan: newPlan.id })
}
