'use client'
import { useState, useEffect, useCallback } from 'react'
import { WeeklyPlan, FoodRow } from '@/types'
import { sumEntries, foodsMap } from '@/lib/recipe'
import { WeekBoard } from '@/components/planner/WeekBoard'
import { QuickFill } from '@/components/planner/QuickFill'
import Link from 'next/link'
import { useSettings } from '@/lib/SettingsContext'
import { Icon } from '@/components/Icon'
import { Tooltip } from '@/components/ui/Tooltip'
import { startOfWeek, toDateParam } from '@/lib/date'

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekBounds(offset: number, weekStartsOn: 0 | 1): { weekStart: Date; weekEnd: Date; weekParam: string } {
  const weekStart = startOfWeek(weekStartsOn, offset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return { weekStart, weekEnd, weekParam: toDateParam(weekStart) }
}

export default function PlannerPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [foods, setFoods] = useState<FoodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  // Direction of the last week move, so the board can arrive from the side it came from.
  const [dir, setDir] = useState<'prev' | 'next' | null>(null)
  // Bumped when a quick-fill lands, so the board can reveal the meals it just received instead
  // of having them appear all at once. Reset by the week nav: arriving at a different week is a
  // different kind of change and gets the slide, not the reveal.
  const [reveal, setReveal] = useState(0)
  const goToWeek = (delta: -1 | 1) => {
    setDir(delta < 0 ? 'prev' : 'next')
    setReveal(0)
    setWeekOffset(o => o + delta)
  }
  // Read-only here: preferences are edited in /settings, not from the planner header.
  const { settings, ready } = useSettings()
  const targets = settings
  const fullTitles = settings.plannerFullTitles
  const weekStartsOn = settings.weekStartsOn

  useEffect(() => {
    fetch('/api/foods').then(r => r.json()).then(setFoods).catch(() => {})
  }, [])

  const fetchPlan = useCallback(async () => {
    // Wait for the confirmed preference. weekStartsOn decides which week is asked for, and the
    // API creates the week it is asked for — so guessing here doesn't just show the wrong days,
    // it writes an empty plan for a week the user never looks at. That is how prod collected
    // junk plans, and how an iPad landed on an empty planner while the real week sat beside it.
    if (!ready) return
    setLoading(true)
    const { weekParam } = getWeekBounds(weekOffset, weekStartsOn)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch(`/api/plans/active?weekStart=${weekParam}`, { signal: ctrl.signal })
      if (res.ok) setPlan(await res.json())
    } catch { /* network error or timeout */ }
    finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }, [weekOffset, weekStartsOn, ready])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  // The refetch has to finish before the reveal is bumped, or the board replays its entrance on
  // the *old* meals and then swaps them out underneath.
  const handleCloned = useCallback(async () => {
    await fetchPlan()
    setDir(null)
    setReveal(r => r + 1)
  }, [fetchPlan])

  const { weekStart, weekEnd } = getWeekBounds(weekOffset, weekStartsOn)

  // Only the *first* load blanks the page. Flipping weeks keeps the header and the board on
  // screen — the old week dims, the new one slides in — instead of dropping the whole planner
  // to a centred "Loading planner…" and rebuilding it.
  if (loading && !plan) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--ink-3)' }}>
      Loading planner…
    </div>
  )
  if (!plan) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12, color: 'var(--ink-3)' }}>
      <span>Could not load planner.</span>
      <button className="btn btn-ghost btn-sm" onClick={fetchPlan}>Retry</button>
    </div>
  )

  const fmap = foodsMap(foods)
  const daysPlanned = plan.days.filter(d => !d.isDismissed && d.meals.length > 0).length
  const totalKcal = plan.days.reduce((sum, d) => sum + (d.isDismissed ? 0 : sumEntries(d.meals, fmap).calories), 0)

  return (
    <main className="page" style={{ maxWidth: 1480 }}>
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Weekly planner</div>
          <h1 className="page-title">Week of <em>{fmt(weekStart)}.</em></h1>
          <p className="page-sub">
            {/* The counts belong to the week on screen; while another is in flight they'd
                contradict the title above them. */}
            {loading ? 'Loading…' : (
              <>
                {daysPlanned} day{daysPlanned !== 1 ? 's' : ''} planned
                {totalKcal > 0 && ` · ${Math.round(totalKcal).toLocaleString()} kcal`}
              </>
            )}
          </p>
        </div>
        {/* Quick-fill sits in this row rather than in a panel of its own below. It's a control,
            the same size of decision as changing the week, and a full-width glass card gave it
            the weight of a section heading. */}
        <div className="planner-controls">
          <QuickFill plan={plan} onCloned={handleCloned} />
          <div className="week-nav">
            <Tooltip label="Previous week">
              <button onClick={() => goToWeek(-1)} aria-label="Previous week">
                <Icon name="chev-left" size={14} />
              </button>
            </Tooltip>
            <span className="label">{fmt(weekStart)} – {fmt(weekEnd)}</span>
            <Tooltip label="Next week">
              <button onClick={() => goToWeek(1)} aria-label="Next week">
                <Icon name="chev-right" size={14} />
              </button>
            </Tooltip>
          </div>
          {/* Both the title-length toggle and the targets modal used to live here. They are
              preferences, and preferences are edited in one place now. */}
          <Link href="/settings" className="btn btn-ghost btn-sm">
            <Icon name="settings" size={14} /> Targets
          </Link>
        </div>
      </div>

      <WeekBoard plan={plan} targets={targets} foods={foods} fullTitles={fullTitles} onPlanUpdate={setPlan} dir={dir} stale={loading} revealKey={reveal} />
    </main>
  )
}
