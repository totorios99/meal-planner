'use client'
import { useState, useEffect, useCallback } from 'react'
import { WeeklyPlan } from '@/types'
import { WeekBoard } from '@/components/planner/WeekBoard'
import { QuickFill } from '@/components/planner/QuickFill'
import { useMacroTargets } from '@/lib/useMacroTargets'
import { TargetsModal } from '@/components/planner/TargetsModal'

export default function PlannerPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const { targets, updateTargets } = useMacroTargets()
  const [showTargets, setShowTargets] = useState(false)

  const fetchPlan = useCallback(async () => {
    const res = await fetch('/api/plans/active')
    const data = await res.json()
    setPlan(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading planner…</div>
  if (!plan) return null

  const weekStart = new Date(plan.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Planner</h1>
          <p className="text-sm text-gray-500 mt-1">
            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
            {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowTargets(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ⚙ Targets
        </button>
      </div>
      {showTargets && (
        <TargetsModal targets={targets} onSave={updateTargets} onClose={() => setShowTargets(false)} />
      )}
      <QuickFill onCloned={fetchPlan} />
      <WeekBoard plan={plan} targets={targets} onPlanUpdate={setPlan} />
    </div>
  )
}
