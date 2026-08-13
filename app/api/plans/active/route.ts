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

  // ponytail: a GET that writes. Every mutation downstream needs a persisted WeeklyPlanDay id
  // (findOwnedDay), so the week has to exist before the first edit; materialising it lazily on
  // write instead would touch the home page, the planner and DayCard. The unique index on
  // (userId, weekStart) is what makes it safe to leave here — see below.
  if (!plan) {
    try {
      const newPlan = await prisma.weeklyPlan.create({
        data: { userId, weekStart, isActive: true }
      })
      await prisma.weeklyPlanDay.createMany({
        data: Array.from({ length: 7 }, (_, dayIndex) => ({ weeklyPlanId: newPlan.id, dayIndex }))
      })
    } catch (err) {
      // P2002: the home page and the planner both fire this on mount, so two requests can reach
      // the create for the same week. The index now rejects the loser instead of letting it
      // write a duplicate row — re-read and serve whichever one won.
      if ((err as { code?: string }).code !== 'P2002') throw err
    }
    plan = await prisma.weeklyPlan.findFirst({
      where: { userId, weekStart: { gte: weekStart, lt: weekEnd } },
      include: planInclude
    })
  }

  return NextResponse.json(plan)
}
