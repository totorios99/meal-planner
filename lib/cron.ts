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
      // One rollover per user. This used to assume a single global active plan, which under
      // multi-user would have archived whoever's plan came back first and left everyone else's
      // week un-rolled.
      const active = await prisma.weeklyPlan.findMany({ where: { isActive: true } })
      const nextMonday = getNextMonday()

      for (const plan of active) {
        // Archive current plan
        await prisma.weeklyPlan.update({
          where: { id: plan.id },
          data: { isActive: false, archivedAt: new Date() }
        })

        // Create next week's plan (Monday through Sunday)
        // ponytail: hardcoded Sunday→Monday, ignores each user's Settings.weekStartsOn. Only
        // pre-creates the week — /api/plans/active creates on demand from a client-supplied
        // date, so a Sunday-start user still gets the right week, just not pre-made.
        const newPlan = await prisma.weeklyPlan.create({
          data: { userId: plan.userId, weekStart: nextMonday, isActive: true }
        })
        for (let i = 0; i < 7; i++) {
          await prisma.weeklyPlanDay.create({
            data: { weeklyPlanId: newPlan.id, dayIndex: i }
          })
        }
      }
    } catch (err) {
      console.error('Cron weekly reset failed:', err)
    }
  })
}
