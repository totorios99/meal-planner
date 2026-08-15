// One-off: remove the empty WeeklyPlan that GET /api/plans/active manufactured when the client
// asked for a Monday-start week the user doesn't use (see the fix in the same commit). Refuses to
// run if the plan turns out to hold meals, so pointing it at the wrong id is a no-op rather than
// a data loss. Usage, inside the container:
//   docker exec mise node /app/data/delete-phantom-plan.js <planId>
const { createClient } = require('@libsql/client')

const planId = Number(process.argv[2])
if (!Number.isInteger(planId)) {
  console.error('usage: node delete-phantom-plan.js <planId>')
  process.exit(1)
}

const db = createClient({ url: 'file:/app/data/meal-planner.db' })

;(async () => {
  const plan = await db.execute({ sql: 'select id, weekStart, userId from WeeklyPlan where id = ?', args: [planId] })
  if (plan.rows.length === 0) {
    console.log(`plan ${planId} does not exist — nothing to do`)
    return
  }
  const { n } = (await db.execute({
    sql: `select count(*) n from WeeklyPlanMeal m
          join WeeklyPlanDay d on m.weeklyPlanDayId = d.id
          where d.weeklyPlanId = ?`,
    args: [planId],
  })).rows[0]

  console.log(`plan ${planId}  weekStart=${plan.rows[0].weekStart}  meals=${n}`)
  if (Number(n) !== 0) {
    console.error('refusing: this plan holds meals')
    process.exit(1)
  }

  await db.execute({ sql: 'delete from WeeklyPlan where id = ?', args: [planId] })
  const left = await db.execute('select id, weekStart, isActive from WeeklyPlan order by weekStart')
  console.log('remaining plans:')
  for (const r of left.rows) console.log(`  ${r.id}  ${r.weekStart}  isActive=${r.isActive}`)
  console.log('integrity:', (await db.execute('pragma integrity_check')).rows[0].integrity_check)
})()
