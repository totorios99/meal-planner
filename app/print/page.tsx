import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PrintButton } from '@/components/print/PrintButton'
import { parseRefs, sumRefs, foodsMap } from '@/lib/recipe'

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

  const fmap = foodsMap(await prisma.food.findMany())

  const weekStart = new Date(plan.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const dateRange =
    fmt(weekStart, { month: 'short', day: 'numeric' }) +
    ' – ' +
    fmt(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })

  const days = plan.days.map(day => {
    const totals = day.meals.reduce(
      (acc, wpm) => {
        const m = sumRefs(parseRefs(wpm.ingredients), fmap)
        return {
          calories: acc.calories + m.calories,
          protein:  acc.protein  + m.protein,
          carbs:    acc.carbs    + m.carbs,
          fats:     acc.fats     + m.fats,
        }
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
    return { day, totals, isEmpty: day.meals.length === 0 }
  })

  // Shopping list: aggregate refs across on-days, group by food + measure, sum quantities.
  const shopping = new Map<string, { name: string; unit: string; quantity: number }>()
  for (const day of plan.days) {
    if (day.isDismissed) continue
    for (const wpm of day.meals) {
      for (const ref of parseRefs(wpm.ingredients)) {
        const food = fmap.get(ref.foodId)
        if (!food) continue
        const unit = ref.measure || food.baseUnit
        const key = `${food.name.toLowerCase()}|${unit.toLowerCase()}`
        const existing = shopping.get(key)
        if (existing) existing.quantity += ref.quantity
        else shopping.set(key, { name: food.name, unit, quantity: ref.quantity })
      }
    }
  }
  const shoppingList = Array.from(shopping.values()).sort((a, b) => a.name.localeCompare(b.name))
  const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(1))

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
                    {day.meals.map(wpm => {
                      const m = sumRefs(parseRefs(wpm.ingredients), fmap)
                      return (
                      <div key={wpm.id} className="print-meal">
                        <div className="print-meal-name">{wpm.meal.title}</div>
                        <div className="print-meal-macros">
                          {Math.round(m.calories)} kcal ·{' '}
                          P {Math.round(m.protein)}g ·{' '}
                          C {Math.round(m.carbs)}g ·{' '}
                          F {Math.round(m.fats)}g
                        </div>
                      </div>
                      )
                    })}
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

        {shoppingList.length > 0 && (
          <div className="print-shopping">
            <h2>Shopping list</h2>
            <ul className="print-shopping-list">
              {shoppingList.map(item => (
                <li key={`${item.name}|${item.unit}`}>
                  <span className="qty">{item.quantity > 0 ? `${fmtQty(item.quantity)}${item.unit ? ' ' + item.unit : ''}` : ''}</span>
                  <span className="name">{item.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="print-foot">
          <span><em>Mise</em> · Meal planner</span>
          <span>Adjust portions &amp; cooking steps in the app.</span>
        </div>
      </div>
    </div>
  )
}
