import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getThisMonday(): Date {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  let plan = await prisma.weeklyPlan.findFirst({
    where: { isActive: true },
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

  if (!plan) {
    const weekStart = getThisMonday()
    const newPlan = await prisma.weeklyPlan.create({
      data: { weekStart, isActive: true }
    })
    for (let i = 0; i < 7; i++) {
      await prisma.weeklyPlanDay.create({
        data: { weeklyPlanId: newPlan.id, dayIndex: i }
      })
    }
    plan = await prisma.weeklyPlan.findFirst({
      where: { id: newPlan.id },
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
  }

  return NextResponse.json(plan)
}
