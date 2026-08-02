import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

function getThisMonday(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

const planInclude = {
  days: {
    orderBy: { dayIndex: 'asc' as const },
    include: {
      meals: {
        orderBy: { slotIndex: 'asc' as const },
        include: { meal: true }
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request)
  const weekParam = request.nextUrl.searchParams.get('weekStart')
  const weekStart = weekParam ? parseLocalDate(weekParam) : getThisMonday()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 1)

  let plan = await prisma.weeklyPlan.findFirst({
    where: { userId, weekStart: { gte: weekStart, lt: weekEnd } },
    include: planInclude
  })

  if (!plan) {
    const newPlan = await prisma.weeklyPlan.create({
      data: { userId, weekStart, isActive: true }
    })
    for (let i = 0; i < 7; i++) {
      await prisma.weeklyPlanDay.create({
        data: { weeklyPlanId: newPlan.id, dayIndex: i }
      })
    }
    plan = await prisma.weeklyPlan.findFirst({
      where: { id: newPlan.id, userId },
      include: planInclude
    })
  }

  return NextResponse.json(plan)
}
