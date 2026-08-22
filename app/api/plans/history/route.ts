import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, guarded } from '@/lib/auth'
import { localDate } from '@/lib/date'

export const GET = guarded(async (request: NextRequest) => {
  const userId = await requireUserId(request)

  // "Past" used to mean isActive: false, which is only the same thing while the current week is
  // the newest plan that exists. Plan next week and that breaks both ways: next week's plan is
  // inactive, so it showed up as a week to copy *from*, and the current week was hidden because
  // it happened to be active. Compare weekStart against the week being viewed instead.
  //
  // `before` is required. The old fallback read isActive, which no longer means anything — and a
  // caller that forgets the param is asking about a week, so guessing one for it is how the wrong
  // week got copied in the first place.
  const before = request.nextUrl.searchParams.get('before')
  if (!before || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    return NextResponse.json({ error: 'before=YYYY-MM-DD required' }, { status: 400 })
  }
  const cutoff = localDate(before)

  const plans = await prisma.weeklyPlan.findMany({
    where: { userId, weekStart: { lt: cutoff } },
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
})
