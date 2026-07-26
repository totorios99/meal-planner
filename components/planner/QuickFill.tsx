'use client'
import { useState, useEffect } from 'react'
import { WeeklyPlan } from '@/types'
import { Select } from '@/components/ui/Select'
import { localDate } from '@/lib/date'

interface Props {
  onCloned: () => void
}

export function QuickFill({ onCloned }: Props) {
  const [history, setHistory] = useState<WeeklyPlan[]>([])
  const [selected, setSelected] = useState('')
  const [cloning, setCloning] = useState(false)

  useEffect(() => {
    // An unchecked .json() used to land {error} in `history`, and .map threw on it.
    fetch('/api/plans/history')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
  }, [])

  async function handleClone() {
    if (!selected) return
    setCloning(true)
    try {
      const res = await fetch(`/api/plans/${selected}/clone`, { method: 'POST' })
      if (!res.ok) throw new Error(String(res.status))
      onCloned()
    } catch {
      // Nothing was copied, so there's no partial state to undo — just say so.
      alert('Could not copy that week. Try again.')
    } finally {
      setCloning(false)
    }
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
                const d = localDate(plan.weekStart)
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
