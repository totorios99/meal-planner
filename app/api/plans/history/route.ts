import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'
import { localDate } from '@/lib/date'

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request)

  // "Past" used to mean isActive: false, which is only the same thing while the current week is
  // the newest plan that exists. Plan next week and that breaks both ways: next week's plan is
  // inactive, so it showed up as a week to copy *from*, and the current week was hidden because
  // it happened to be active. Compare weekStart against the week being viewed instead.
  const before = request.nextUrl.searchParams.get('before')
  const cutoff = before && /^\d{4}-\d{2}-\d{2}$/.test(before) ? localDate(before) : null

  const plans = await prisma.weeklyPlan.findMany({
    where: { userId, ...(cutoff ? { weekStart: { lt: cutoff } } : { isActive: false }) },
    orderBy: { weekStart: 'desc' },
    include: {
      days: {
        orderBy: { dayIndex: 'asc' },
        include: {
          meals: {
            orderBy: { slotIndex: 'asc' },
            include: { meal: true }
          }
        }
      }
    }
  })
  return NextResponse.json(plans)
}
