import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request)
  const plans = await prisma.weeklyPlan.findMany({
    where: { userId, isActive: false },
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
