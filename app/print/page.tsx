import Link from 'next/link'
import { LearnArrow } from '@/components/LearnArrow'
import { prisma } from '@/lib/prisma'
import { PrintButton } from '@/components/print/PrintButton'
import { parseRefs, sumRefs, foodsMap, hasUnfilledIngredient, formatQuantityWithUnit } from '@/lib/recipe'
import { requireUserIdForPage } from '@/lib/auth'
import { localDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString('en-US', opts)
}

function dayDate(weekStart: Date, dayIndex: number) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayIndex)
  return d
}

// Which week to print comes from the caller, never from the server's clock: the container runs
// in UTC, so deriving it here prints next week from Saturday evening onwards. The links into this
// page (Nav, the home page action) all compute it in browser-local time. This used to look up
// `isActive: true`, which several plans carried at once — it printed an arbitrary one, sometimes
// an empty one.
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>
}) {
  const userId = await requireUserIdForPage()
  const { weekStart: weekParam } = await searchParams
  const queryStart = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? localDate(weekParam) : null
  // Half-open day range rather than an equality match: the older rows were stored at T06:00
  // rather than local midnight, and `equals` misses those.
  const queryEnd = queryStart && new Date(queryStart.getTime() + 24 * 60 * 60 * 1000)

  const plan = queryStart && queryEnd && await prisma.weeklyPlan.findFirst({
    where: { userId, weekStart: { gte: queryStart, lt: queryEnd } },
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
      <main className="print-shell">
        <div className="print-paper" style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-3)' }}>
          Nothing planned for this week. <Link href="/planner" className="t-learn" style={{ color: 'var(--accent-ink)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            Go to planner <LearnArrow size={13} />
          </Link>
        </div>
      </main>
    )
  }

  const fmap = foodsMap(await prisma.food.findMany({ where: { userId } }))

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

  return (
    <main className="print-shell">
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
                  <span>{fmt(date, { weekday: 'long' })}</span>
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
                      const refs = parseRefs(wpm.ingredients)
                      const m = sumRefs(refs, fmap)
                      const needsInput = hasUnfilledIngredient(refs, fmap)
                      return (
                      <div key={wpm.id} className="print-meal">
                        <div className="print-meal-name">
                          {wpm.meal.title}
                          {needsInput && <span className="print-meal-veg-warning">incomplete</span>}
                        </div>
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
                  <span className="qty">{item.quantity > 0 ? formatQuantityWithUnit(item.quantity, item.unit, item.name) : ''}</span>
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
    </main>
  )
}
