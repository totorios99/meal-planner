import cron from 'node-cron'
import { prisma } from './prisma'

function getNextMonday(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1) // Sunday → Monday
  d.setHours(0, 0, 0, 0)
  return d
}

export function startCronJobs() {
  // Every Sunday at midnight local time
  cron.schedule('0 0 * * 0', async () => {
    try {
      const active = await prisma.weeklyPlan.findFirst({ where: { isActive: true } })
      if (!active) return

      // Archive current plan
      await prisma.weeklyPlan.update({
        where: { id: active.id },
        data: { isActive: false, archivedAt: new Date() }
      })

      // Create next week's plan (Monday through Sunday)
      const nextMonday = getNextMonday()
      const newPlan = await prisma.weeklyPlan.create({
        data: { weekStart: nextMonday, isActive: true }
      })
      for (let i = 0; i < 7; i++) {
        await prisma.weeklyPlanDay.create({
          data: { weeklyPlanId: newPlan.id, dayIndex: i }
        })
      }
    } catch (err) {
      console.error('Cron weekly reset failed:', err)
    }
  })
}
