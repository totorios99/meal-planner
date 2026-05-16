'use client'
import { useState, useEffect } from 'react'
import { WeeklyPlan } from '@/types'

interface Props {
  onCloned: () => void
}

export function QuickFill({ onCloned }: Props) {
  const [history, setHistory] = useState<WeeklyPlan[]>([])
  const [selected, setSelected] = useState('')
  const [cloning, setCloning] = useState(false)

  useEffect(() => {
    fetch('/api/plans/history').then(r => r.json()).then(setHistory)
  }, [])

  async function handleClone() {
    if (!selected) return
    setCloning(true)
    await fetch(`/api/plans/${selected}/clone`, { method: 'POST' })
    setCloning(false)
    onCloned()
  }

  if (history.length === 0) return null

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
      <span className="text-sm text-blue-700 font-medium shrink-0">Quick-Fill from past week:</span>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="flex-1 text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
      >
        <option value="">— pick a week —</option>
        {history.map(plan => {
          const d = new Date(plan.weekStart)
          return (
            <option key={plan.id} value={plan.id}>
              Week of {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </option>
          )
        })}
      </select>
      <button
        onClick={handleClone}
        disabled={!selected || cloning}
        className="shrink-0 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
      >
        {cloning ? 'Applying…' : 'Apply'}
      </button>
    </div>
  )
}
