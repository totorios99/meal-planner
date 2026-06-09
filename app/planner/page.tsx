'use client'
import { useState, useEffect, useCallback } from 'react'
import { WeeklyPlan } from '@/types'
import { WeekBoard } from '@/components/planner/WeekBoard'
import { QuickFill } from '@/components/planner/QuickFill'
import { useMacroTargets } from '@/lib/useMacroTargets'
import { TargetsModal } from '@/components/planner/TargetsModal'
import { Icon } from '@/components/Icon'

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PlannerPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const { targets, updateTargets } = useMacroTargets()
  const [showTargets, setShowTargets] = useState(false)

  const fetchPlan = useCallback(async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch('/api/plans/active', { signal: ctrl.signal })
      if (res.ok) setPlan(await res.json())
    } catch { /* network error or timeout */ }
    finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--ink-4)' }}>
      Loading planner…
    </div>
  )
  if (!plan) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12, color: 'var(--ink-4)' }}>
      <span>Could not load planner.</span>
      <button className="btn btn-ghost btn-sm" onClick={fetchPlan}>Retry</button>
    </div>
  )

  const weekStart = new Date(plan.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const daysPlanned = plan.days.filter(d => !d.isDismissed && d.meals.length > 0).length
  const totalKcal = plan.days.reduce((sum, d) => {
    if (d.isDismissed) return sum
    return sum + d.meals.reduce((s, m) => s + m.meal.calories * m.portionMultiplier, 0)
  }, 0)

  return (
    <div className="page" style={{ maxWidth: 1480 }}>
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Weekly planner</div>
          <h1 className="page-title">Week of <em>{fmt(weekStart)}.</em></h1>
          <p className="page-sub">
            {daysPlanned} day{daysPlanned !== 1 ? 's' : ''} planned
            {totalKcal > 0 && ` · ${Math.round(totalKcal).toLocaleString()} kcal`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div className="week-nav">
            <button disabled title="Previous week"><Icon name="chev-left" size={14} /></button>
            <span className="label">{fmt(weekStart)} – {fmt(weekEnd)}</span>
            <button disabled title="Next week"><Icon name="chev-right" size={14} /></button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowTargets(true)}>
            <Icon name="settings" size={14} /> Targets
          </button>
        </div>
      </div>

      <QuickFill onCloned={fetchPlan} />
      <WeekBoard plan={plan} targets={targets} onPlanUpdate={setPlan} />

      {showTargets && (
        <TargetsModal targets={targets} onSave={updateTargets} onClose={() => setShowTargets(false)} />
      )}
    </div>
  )
}
