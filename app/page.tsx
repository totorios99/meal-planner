'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { WeeklyPlan, Meal, FoodRow } from '@/types'
import { parseRefs, sumRefs, sumEntries, foodsMap } from '@/lib/recipe'
import { localDate, startOfWeek, toDateParam, todayIndex, dayName } from '@/lib/date'
import { useSettings } from '@/lib/SettingsContext'
import { MealCard } from '@/components/meals/MealCard'
import { MealModal } from '@/components/meals/MealModal'
import { Icon } from '@/components/Icon'
import { LearnArrow } from '@/components/LearnArrow'
import { SpinningCounter } from '@/components/ui/SpinningCounter'


function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function dayDate(weekStart: Date, idx: number) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + idx)
  return d
}

// The ring's percentage is the one number the page exists to show, and it lands ~300ms after
// mount when the plan fetch resolves. Snapping it while the arcs sweep reads as two unrelated
// events, so it counts to the same curve. Interruptible: a re-fetch resumes from where it is.
function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = requestAnimationFrame(function tick(t) {
      const p = Math.min(1, (t - start) / ms)
      const eased = a + (target - a) * (1 - Math.pow(1 - p, 3))
      from.current = eased
      setValue(eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

function MacroRing({ protein, carbs, fats, kcal, targets }: {
  protein: number; carbs: number; fats: number; kcal: number
  targets: { calories: number; protein: number; carbs: number; fats: number }
}) {
  const size = 120, thickness = 11
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const kcalPct = useCountUp(targets.calories > 0 ? Math.min(1, kcal / targets.calories) : 0)
  const segs = [
    { val: protein, tgt: targets.protein, color: 'var(--protein)' },
    { val: carbs,   tgt: targets.carbs,   color: 'var(--carbs)'   },
    { val: fats,    tgt: targets.fats,    color: 'var(--fats)'    },
  ]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} stroke="var(--bg-sunken)" strokeWidth={thickness} fill="none" />
      {segs.map((s, i) => {
        const pct = s.tgt > 0 ? Math.min(1, s.val / s.tgt) : 0
        const fillLen = (c / 3) * pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            className="macro-arc"
            style={{ transitionDelay: `${i * 90}ms` }}
            stroke={s.color} strokeWidth={thickness} fill="none"
            strokeDasharray={`${fillLen} ${c - fillLen}`}
            strokeDashoffset={-(c * i / 3)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--display)" fontSize={size * 0.25} fontWeight="500" fill="var(--ink)">
        {Math.round(kcalPct * 100)}%
      </text>
      <text x={cx} y={cy + size * 0.17} textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--sans)" fontSize={size * 0.095} fill="var(--ink-3)" letterSpacing="2">
        KCAL
      </text>
    </svg>
  )
}

function MacroRows({ protein, carbs, fats, targets }: {
  protein: number; carbs: number; fats: number
  targets: { protein: number; carbs: number; fats: number }
}) {
  const rows = [
    { label: 'Protein', val: protein, tgt: targets.protein, color: '#3F4FB2' },
    { label: 'Carbs',   val: carbs,   tgt: targets.carbs,   color: '#C28A2C' },
    { label: 'Fats',    val: fats,    tgt: targets.fats,    color: '#8C4A8A' },
  ]
  return (
    <div className="macros-rows">
      {rows.map(r => {
        const pct = r.tgt > 0 ? Math.min(100, (r.val / r.tgt) * 100) : 0
        const over = r.val > r.tgt
        return (
          <div key={r.label} className="macro-row-item">
            <div className="macro-row-label">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, display: 'inline-block', flexShrink: 0 }} />
              {r.label}
            </div>
            <div className="macro-row-bar">
              <div className="macro-row-bar-fill" style={{ width: `${pct}%`, background: over ? 'var(--warn)' : r.color }} />
            </div>
            <div className="macro-row-val" style={{ color: over ? 'var(--warn)' : undefined }}>
              {Math.round(r.val)}/{r.tgt}g
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function HomePage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [foods, setFoods] = useState<FoodRow[]>([])
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [showNewMeal, setShowNewMeal] = useState(false)
  // Read-only: targets are edited in /settings. Still needed here to draw the rings against.
  const { settings: targets, ready } = useSettings()
  const weekStartsOn = targets.weekStartsOn
  const todayIdx = todayIndex(weekStartsOn)
  const weekDaysRef = useRef<HTMLDivElement>(null)

  const fetchAll = useCallback(async () => {
    // Same reason as the planner: the week asked for is the week created, so a preference that
    // hasn't been confirmed yet would mint an empty plan for the wrong Monday.
    if (!ready) return
    try {
      const [planRes, mealsRes, foodsRes] = await Promise.all([
        fetch(`/api/plans/active?weekStart=${toDateParam(startOfWeek(weekStartsOn))}`),
        fetch('/api/meals'),
        fetch('/api/foods'),
      ])
      if (planRes.ok) setPlan(await planRes.json())
      if (mealsRes.ok) setMeals(await mealsRes.json())
      if (foodsRes.ok) setFoods(await foodsRes.json())
    } catch { /* silently degrade */ }
  }, [weekStartsOn, ready])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    // Center today's chip within the horizontal strip only — scrollIntoView
    // would scroll the whole page vertically to the strip on load.
    const container = weekDaysRef.current
    const el = container?.querySelector('.today') as HTMLElement | null
    if (container && el) {
      container.scrollLeft +=
        el.getBoundingClientRect().left - container.getBoundingClientRect().left
        - (container.clientWidth - el.clientWidth) / 2
    }
  }, [plan])

  const today = plan?.days.find(d => d.dayIndex === todayIdx)
  const todayMeals = today?.meals ?? []
  // localDate, not new Date(): weekStart is stored as a UTC timestamp and rendering it
  // directly labels the week a day early for anyone west of UTC (AGENTS.md, timezones).
  const weekStart = plan ? localDate(plan.weekStart) : null

  const fmap = foodsMap(foods)
  const daysOn = plan ? plan.days.filter(d => !d.isDismissed).length : 0
  const weekKcal = plan
    ? plan.days.reduce((s, d) => s + (d.isDismissed ? 0 : sumEntries(d.meals, fmap).calories), 0)
    : 0
  const weekRange = weekStart
    ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dayDate(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${dayDate(weekStart, 6).getFullYear()}`
    : ''

  const todayTotals = sumEntries(todayMeals, fmap)

  const now = new Date()
  const eyebrow = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  async function handleDelete(id: number) {
    const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      alert(body?.error ?? 'Could not delete meal')
      return
    }
    fetchAll()
  }

  return (
    <main className="page home">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow" suppressHydrationWarning>{eyebrow}</div>
          <h1 className="page-title" suppressHydrationWarning>{greeting()}, <em>Antonio.</em></h1>
          <p className="home-sub">Here&apos;s your week at a glance.</p>
        </div>
      </div>

      {/* Two-col: Today's meals + Macros */}
      <div className="home-grid">
        {/* Today's meals */}
        <div className="today-card">
          <div className="today-head">
            <h2>Today&apos;s meals</h2>
            <span className="today-date">
              {plan && `${todayMeals.length} meal${todayMeals.length !== 1 ? 's' : ''} · ${Math.round(todayTotals.calories)} kcal`}
            </span>
          </div>

          {/* `plan === null` means "still fetching", not "empty" — rendering the empty
              state before the fetch lands flashed "No meals planned yet" on every
              load. The skeleton holds that second and cross-fades into the real rows. */}
          <div className={`today-skel t-skel${plan ? ' is-revealed' : ''}`}>
            <div className="t-skel-skeleton" aria-hidden>
              <div className="today-skel-row shimmer" />
              <div className="today-skel-row shimmer" />
              <div className="today-skel-row shimmer" />
            </div>
            <div className="t-skel-content">
          {today?.isDismissed ? (
            <div style={{ color: 'var(--off)', fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Icon name="trip" size={24} />
              {today.justification || 'Off day'}
            </div>
          ) : todayMeals.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              No meals planned yet.{' '}
              <Link href="/planner" className="t-learn" style={{ color: 'var(--accent-ink)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                Open planner <LearnArrow size={13} />
              </Link>
            </div>
          ) : (
            <div className="today-meals">
              {todayMeals.map(wpm => {
                const mac = sumRefs(parseRefs(wpm.ingredients), fmap)
                return (
                <Link key={wpm.id} href={`/meals/${wpm.mealId}?pm=${wpm.id}`} className="today-meal">
                  <div className="today-meal-thumb">
                    {wpm.meal.imageUrl && <img src={wpm.meal.imageUrl} alt={wpm.meal.title} />}
                  </div>
                  <div className="today-meal-info">
                    <div className="today-meal-name">{wpm.meal.title}</div>
                    <div className="today-meal-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3F4FB2', display: 'inline-block' }} />
                        {Math.round(mac.protein)}g
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C28A2C', display: 'inline-block' }} />
                        {Math.round(mac.carbs)}g
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8C4A8A', display: 'inline-block' }} />
                        {Math.round(mac.fats)}g
                      </span>
                    </div>
                  </div>
                  <div className="today-meal-kcal">{Math.round(mac.calories)}</div>
                </Link>
                )
              })}
            </div>
          )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
            <Link href="/planner" className="btn btn-ghost btn-sm">
              <Icon name="calendar" size={13} /> Open planner
            </Link>
            <Link href="/meals" className="btn btn-quiet btn-sm">
              <Icon name="book" size={13} /> Browse meals
            </Link>
          </div>
        </div>

        {/* Macros */}
        <div className="macros-block">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2>Today&apos;s macros</h2>
            <Link href="/settings" className="btn btn-ghost btn-sm">
              <Icon name="settings" size={13} /> Targets
            </Link>
          </div>
          <div className="macros-ring-wrap">
            <MacroRing
              protein={todayTotals.protein}
              carbs={todayTotals.carbs}
              fats={todayTotals.fats}
              kcal={todayTotals.calories}
              targets={targets}
            />
            <MacroRows
              protein={todayTotals.protein}
              carbs={todayTotals.carbs}
              fats={todayTotals.fats}
              targets={targets}
            />
          </div>
        </div>
      </div>

      {/* Week strip */}
      {plan && weekStart && (
        <div className="week-strip">
          <div className="week-strip-head">
            <h2>This week</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="week-strip-sub">
                {weekRange} · {daysOn} day{daysOn !== 1 ? 's' : ''} on · <SpinningCounter value={weekKcal} /> kcal
              </span>
              <Link href="/planner" className="section-link t-learn">
                Open planner <LearnArrow size={13} />
              </Link>
            </div>
          </div>
          <div className="week-strip-days" ref={weekDaysRef}>
            {plan.days.map(day => {
              const date = dayDate(weekStart, day.dayIndex)
              const isToday = day.dayIndex === todayIdx
              const kcal = day.isDismissed ? 0 : day.meals.reduce((s, m) => s + sumRefs(parseRefs(m.ingredients), fmap).calories, 0)
              return (
                <Link
                  key={day.id}
                  href="/planner"
                  className={`week-day${isToday ? ' today' : ''}${day.isDismissed ? ' off' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="week-day-name">{dayName(date, 'short')}</div>
                  <div className="week-day-date">{date.getDate()}</div>
                  {day.isDismissed ? (
                    <div className="week-day-off-label">{day.justification || 'Off day'}</div>
                  ) : (
                    <>
                      <div className="week-day-meals">
                        {day.meals.slice(0, 3).map(m => (
                          <div key={m.id} className="week-day-meal">{m.meal.title}</div>
                        ))}
                      </div>
                      {kcal > 0 && <div className="week-day-kcal">{Math.round(kcal)} kcal</div>}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="quick-actions">
        {[
          { icon: 'calendar', title: 'Plan the weekend', sub: 'Fill in Saturday & Sunday', href: '/planner' },
          { icon: 'plus',     title: 'Add a new meal',   sub: 'Expand your cookbook',      action: () => setShowNewMeal(true) },
          { icon: 'printer',  title: 'Print this week',  sub: 'Fridge-ready reference',    href: `/print?weekStart=${toDateParam(startOfWeek(weekStartsOn))}` },
        ].map(qa => (
          qa.href ? (
            <Link key={qa.title} href={qa.href} className="qa-card" style={{ textDecoration: 'none' }}>
              <div className="qa-icon"><Icon name={qa.icon} size={20} /></div>
              <div className="qa-text">
                <div className="qa-title">{qa.title}</div>
                <div className="qa-sub">{qa.sub}</div>
              </div>
            </Link>
          ) : (
            <button key={qa.title} className="qa-card" onClick={qa.action}>
              <div className="qa-icon"><Icon name={qa.icon} size={20} /></div>
              <div className="qa-text">
                <div className="qa-title">{qa.title}</div>
                <div className="qa-sub">{qa.sub}</div>
              </div>
            </button>
          )
        ))}
      </div>

      {/* Recently added */}
      {meals.length > 0 && (
        <div>
          <div className="section-head">
            <h2 className="section-title">Recently added</h2>
            <Link href="/meals" className="section-link t-learn">
              View cookbook <LearnArrow size={13} />
            </Link>
          </div>
          <div className="meal-grid">
            {meals.slice(0, 3).map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                onEdit={m => setEditingMeal(m)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {(showNewMeal || editingMeal) && (
        <MealModal
          meal={editingMeal}
          onClose={() => { setShowNewMeal(false); setEditingMeal(null) }}
          onSaved={fetchAll}
        />
      )}
    </main>
  )
}
