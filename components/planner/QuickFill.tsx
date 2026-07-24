'use client'
import { useState, useEffect } from 'react'
import { WeeklyPlan } from '@/types'
import { Select } from '@/components/ui/Select'

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
      <Select
        value={selected}
        onChange={setSelected}
        disabled={history.length === 0}
        options={history.length === 0
          ? [{ value: '', label: '— no past weeks yet —' }]
          : [
              { value: '', label: '— pick a week —' },
              ...history.map(plan => {
                const d = new Date(plan.weekStart)
                return {
                  value: String(plan.id),
                  label: `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
                }
              }),
            ]
        }
      />
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
