'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { WeeklyPlan, Meal } from '@/types'
import { useMacroTargets } from '@/lib/useMacroTargets'
import { MealCard } from '@/components/meals/MealCard'
import { MealModal } from '@/components/meals/MealModal'
import { TargetsModal } from '@/components/planner/TargetsModal'
import { Icon } from '@/components/Icon'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function todayDayIndex() {
  return (new Date().getDay() + 6) % 7
}

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

function MacroRing({ protein, carbs, fats, kcal, targets }: {
  protein: number; carbs: number; fats: number; kcal: number
  targets: { calories: number; protein: number; carbs: number; fats: number }
}) {
  const size = 120, thickness = 11
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const kcalPct = targets.calories > 0 ? Math.min(1, kcal / targets.calories) : 0
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
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [showNewMeal, setShowNewMeal] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const { targets, updateTargets } = useMacroTargets()

  const fetchAll = useCallback(async () => {
    try {
      const [planRes, mealsRes] = await Promise.all([
        fetch('/api/plans/active'),
        fetch('/api/meals'),
      ])
      if (planRes.ok) setPlan(await planRes.json())
      if (mealsRes.ok) setMeals(await mealsRes.json())
    } catch { /* silently degrade */ }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const today = plan?.days.find(d => d.dayIndex === todayDayIndex())
  const todayMeals = today?.meals ?? []
  const weekStart = plan ? new Date(plan.weekStart) : null

  const daysOn = plan ? plan.days.filter(d => !d.isDismissed).length : 0
  const weekKcal = plan
    ? plan.days.reduce((s, d) => s + (d.isDismissed ? 0 : d.meals.reduce((a, m) => a + m.meal.calories * m.portionMultiplier, 0)), 0)
    : 0
  const weekRange = weekStart
    ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dayDate(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${dayDate(weekStart, 6).getFullYear()}`
    : ''

  const todayTotals = todayMeals.reduce((acc, wpm) => ({
    calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
    protein:  acc.protein  + wpm.meal.protein  * wpm.portionMultiplier,
    carbs:    acc.carbs    + wpm.meal.carbs    * wpm.portionMultiplier,
    fats:     acc.fats     + wpm.meal.fats     * wpm.portionMultiplier,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  const now = new Date()
  const eyebrow = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  async function handleDelete(id: number) {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-text">
          <div className="page-eyebrow" suppressHydrationWarning>{eyebrow}</div>
          <h1 className="page-title" suppressHydrationWarning>{greeting()}, <em>Antonio.</em></h1>
          <p className="page-sub">Here&apos;s your week at a glance.</p>
        </div>
      </div>

      {/* Two-col: Today's meals + Macros */}
      <div className="home-grid">
        {/* Today's meals */}
        <div className="today-card">
          <div className="today-head">
            <h2>Today&apos;s meals</h2>
            <span className="today-date">
              {todayMeals.length} meal{todayMeals.length !== 1 ? 's' : ''} · {Math.round(todayTotals.calories)} kcal
            </span>
          </div>

          {today?.isDismissed ? (
            <div style={{ color: 'var(--off)', fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Icon name="trip" size={24} />
              {today.justification || 'Off day'}
            </div>
          ) : todayMeals.length === 0 ? (
            <div style={{ color: 'var(--ink-4)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              No meals planned yet.{' '}
              <Link href="/planner" style={{ color: 'var(--accent)' }}>Open planner →</Link>
            </div>
          ) : (
            <div className="today-meals">
              {todayMeals.map(wpm => (
                <div key={wpm.id} className="today-meal">
                  <div className="today-meal-thumb">
                    {wpm.meal.imageUrl && <img src={wpm.meal.imageUrl} alt={wpm.meal.title} />}
                  </div>
                  <div className="today-meal-info">
                    <div className="today-meal-name">{wpm.meal.title}</div>
                    <div className="today-meal-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3F4FB2', display: 'inline-block' }} />
                        {Math.round(wpm.meal.protein * wpm.portionMultiplier)}g
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C28A2C', display: 'inline-block' }} />
                        {Math.round(wpm.meal.carbs * wpm.portionMultiplier)}g
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8C4A8A', display: 'inline-block' }} />
                        {Math.round(wpm.meal.fats * wpm.portionMultiplier)}g
                      </span>
                    </div>
                  </div>
                  <div className="today-meal-kcal">{Math.round(wpm.meal.calories * wpm.portionMultiplier)}</div>
                </div>
              ))}
            </div>
          )}

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
            <button className="btn btn-ghost btn-sm" onClick={() => setShowTargets(true)}>
              <Icon name="settings" size={13} /> Targets
            </button>
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
                {weekRange} · {daysOn} day{daysOn !== 1 ? 's' : ''} on · {Math.round(weekKcal).toLocaleString()} kcal
              </span>
              <Link href="/planner" className="section-link">
                Open planner <Icon name="arrow-right" size={13} />
              </Link>
            </div>
          </div>
          <div className="week-strip-days">
            {plan.days.map(day => {
              const date = dayDate(weekStart, day.dayIndex)
              const isToday = day.dayIndex === todayDayIndex()
              const kcal = day.isDismissed ? 0 : day.meals.reduce((s, m) => s + m.meal.calories * m.portionMultiplier, 0)
              return (
                <Link
                  key={day.id}
                  href="/planner"
                  className={`week-day${isToday ? ' today' : ''}${day.isDismissed ? ' off' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="week-day-name">{DAY_ABBR[day.dayIndex]}</div>
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
          { icon: 'printer',  title: 'Print this week',  sub: 'Fridge-ready reference',    href: '/print' },
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
            <Link href="/meals" className="section-link">
              View cookbook <Icon name="arrow-right" size={13} />
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
      {showTargets && (
        <TargetsModal targets={targets} onSave={updateTargets} onClose={() => setShowTargets(false)} />
      )}
    </div>
  )
}
