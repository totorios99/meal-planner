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

  return (
    <div className="quick-fill">
      <span className="quick-fill-label">Quick-fill from past week</span>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        disabled={history.length === 0}
      >
        {history.length === 0
          ? <option value="">— no past weeks yet —</option>
          : <>
              <option value="">— pick a week —</option>
              {history.map(plan => {
                const d = new Date(plan.weekStart)
                return (
                  <option key={plan.id} value={plan.id}>
                    Week of {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </option>
                )
              })}
            </>
        }
      </select>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleClone}
        disabled={!selected || cloning}
      >
        {cloning ? 'Applying…' : 'Apply'}
      </button>
    </div>
  )
}
