import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, guarded } from '@/lib/auth'
import { getSettings } from '@/lib/settings.server'

/**
 * Fallback for a caller that sent no `?weekStart`.
 *
 * Two things were wrong with the Monday-hardcoded version this replaces. It ignored
 * `weekStartsOn` entirely, so a Sunday-start user did not merely *see* the wrong week — this
 * route creates the week it decides on, so it persisted one. And it still reads the server
 * clock, which in the container is UTC.
 *
 * The timezone half cannot be fixed here: only the browser knows the user's local date, which
 * is why AGENTS.md says to always pass `weekStart` as a query param and treat this as a
 * fallback to avoid triggering. The preference half is fixable, and is.
 */
function weekStartFromServerClock(weekStartsOn: 0 | 1): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day < weekStartsOn ? -7 + weekStartsOn - day : weekStartsOn - day
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

export const GET = guarded(async (request: NextRequest) => {
  const userId = await requireUserId(request)
  const weekParam = request.nextUrl.searchParams.get('weekStart')
  const weekStart = weekParam
    ? parseLocalDate(weekParam)
    : weekStartFromServerClock((await getSettings(request)).weekStartsOn)
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
      // No isActive. It used to be set here and never cleared, so every week the user so much as
      // looked at became "active" — the flag accumulated instead of moving, and the readers that
      // trusted it picked an arbitrary one. "Current" is a fact about the clock, not something a
      // row can remember; every reader now derives it from weekStart. The column stays, unread.
      const newPlan = await prisma.weeklyPlan.create({
        data: { userId, weekStart }
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
})
