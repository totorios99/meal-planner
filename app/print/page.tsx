import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PrintButton } from '@/components/print/PrintButton'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString('en-US', opts)
}

function dayDate(weekStart: Date, dayIndex: number) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayIndex)
  return d
}

export default async function PrintPage() {
  const plan = await prisma.weeklyPlan.findFirst({
    where: { isActive: true },
    include: {
      days: {
        orderBy: { dayIndex: 'asc' },
        include: {
          meals: {
            orderBy: { slotIndex: 'asc' },
            include: { meal: true },
          },
        },
      },
    },
  })

  if (!plan) {
    return (
      <div className="print-shell">
        <div className="print-paper" style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-3)' }}>
          No active plan. <Link href="/planner" style={{ color: 'var(--accent)' }}>Go to planner →</Link>
        </div>
      </div>
    )
  }

  const weekStart = new Date(plan.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const dateRange =
    fmt(weekStart, { month: 'short', day: 'numeric' }) +
    ' – ' +
    fmt(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })

  const days = plan.days.map(day => {
    const totals = day.meals.reduce(
      (acc, wpm) => ({
        calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
        protein:  acc.protein  + wpm.meal.protein  * wpm.portionMultiplier,
        carbs:    acc.carbs    + wpm.meal.carbs    * wpm.portionMultiplier,
        fats:     acc.fats     + wpm.meal.fats     * wpm.portionMultiplier,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
    return { day, totals, isEmpty: day.meals.length === 0 }
  })

  return (
    <div className="print-shell">
      {/* Screen-only toolbar */}
      <div className="print-toolbar">
        <div className="print-toolbar-info">
          <span className="title">Weekly <em>Meal</em> Reference</span>
          <span className="dates">{dateRange}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/planner" className="btn btn-ghost btn-sm">Edit plan</Link>
          <PrintButton />
        </div>
      </div>

      {/* Paper */}
      <div className="print-paper">
        <div className="print-paper-head">
          <h1>Weekly <em>Meal</em> Reference</h1>
          <div className="meta">
            <b>Mise</b>
            {dateRange}
          </div>
        </div>

        <div className="print-table">
          {days.map(({ day, totals, isEmpty }) => {
            const date = dayDate(weekStart, day.dayIndex)
            return (
              <div key={day.id} className="print-day">
                <div className="print-day-head">
                  <span>{DAY_NAMES[day.dayIndex]}</span>
                  {day.isDismissed
                    ? <span className="off">off</span>
                    : <span className="date">{fmt(date, { month: 'short', day: 'numeric' })}</span>
                  }
                </div>

                {day.isDismissed ? (
                  <div className="print-day-off-body">
                    {day.justification || 'Day off'}
                  </div>
                ) : isEmpty ? (
                  <div className="print-day-off-body" style={{ opacity: 0.4 }}>
                    No meals planned
                  </div>
                ) : (
                  <>
                    {day.meals.map(wpm => (
                      <div key={wpm.id} className="print-meal">
                        <div className="print-meal-name">
                          {wpm.meal.title}
                          {wpm.portionMultiplier !== 1 && (
                            <span style={{ fontWeight: 400, color: '#98897A' }}> ×{wpm.portionMultiplier}</span>
                          )}
                        </div>
                        <div className="print-meal-macros">
                          {Math.round(wpm.meal.calories * wpm.portionMultiplier)} kcal ·{' '}
                          P {Math.round(wpm.meal.protein * wpm.portionMultiplier)}g ·{' '}
                          C {Math.round(wpm.meal.carbs * wpm.portionMultiplier)}g ·{' '}
                          F {Math.round(wpm.meal.fats * wpm.portionMultiplier)}g
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!day.isDismissed && !isEmpty && day.justification && (
                  <div className="print-day-note">{day.justification}</div>
                )}

                {!day.isDismissed && !isEmpty && (
                  <div className="print-day-totals">
                    <div className="kcal">
                      {Math.round(totals.calories)}
                      <small>kcal</small>
                    </div>
                    <div className="pcf">
                      P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fats)}g
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="print-foot">
          <span><em>Mise</em> · Meal planner</span>
          <span>For ingredients &amp; cooking instructions, see the app.</span>
        </div>
      </div>
    </div>
  )
}
