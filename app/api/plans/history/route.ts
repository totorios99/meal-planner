import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const plans = await prisma.weeklyPlan.findMany({
    where: { isActive: false },
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
