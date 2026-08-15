'use client'
import { useState, useEffect } from 'react'
import { WeeklyPlan } from '@/types'
import { Select } from '@/components/ui/Select'
import { localDate, toDateParam, weekLabel } from '@/lib/date'
import { useSettings } from '@/lib/SettingsContext'

interface Props {
  // The week currently on screen: both the cutoff for "past" and the destination of the copy.
  plan: WeeklyPlan
  onCloned: () => void
}

export function QuickFill({ plan, onCloned }: Props) {
  const [history, setHistory] = useState<WeeklyPlan[]>([])
  const [selected, setSelected] = useState('')
  const [cloning, setCloning] = useState(false)
  const { settings } = useSettings()
  const viewing = localDate(plan.weekStart)
  const weekStart = toDateParam(viewing)

  useEffect(() => {
    // An unchecked .json() used to land {error} in `history`, and .map threw on it.
    fetch(`/api/plans/history?before=${weekStart}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
    // Weeks earlier than the one on screen — so the list changes as you page through weeks.
    setSelected('')
  }, [weekStart])

  // Empty weeks are not offered. Applying one is purely destructive — the copy clears each day
  // before refilling it, so picking a week with nothing in it wipes the week you're looking at.
  const sources = history
    .map(p => ({
      plan: p,
      meals: p.days.reduce((n, d) => n + d.meals.length, 0),
    }))
    .filter(s => s.meals > 0)

  async function handleClone() {
    if (!selected) return
    setCloning(true)
    try {
      const res = await fetch(`/api/plans/${selected}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlanId: plan.id }),
      })
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
      <span className="quick-fill-label">Quick-fill</span>
      <Select
        value={selected}
        onChange={setSelected}
        disabled={sources.length === 0}
        options={sources.length === 0
          ? [{ value: '', label: '— no past weeks yet —' }]
          : [
              { value: '', label: '— pick a week —' },
              // Two plans can land on the same week — the ones straddling a change of week start
              // do. The meal count is what tells them apart, and it's worth seeing anyway when
              // you're choosing a week to copy.
              ...sources.map(({ plan: p, meals }) => ({
                value: String(p.id),
                label: `${weekLabel(p.weekStart, viewing, settings.weekStartsOn)} · ${meals} meal${meals !== 1 ? 's' : ''}`,
              })),
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
