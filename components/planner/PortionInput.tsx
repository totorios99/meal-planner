'use client'
import { Icon } from '@/components/Icon'

interface Props {
  value: number
  entryId: number
  planId: number
  dayId: number
  onChange: (entryId: number, newMultiplier: number) => void
}

export function PortionInput({ value, entryId, planId, dayId, onChange }: Props) {
  async function update(next: number) {
    if (next < 0.5) return
    await fetch(`/api/plans/${planId}/days/${dayId}/meals/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portionMultiplier: next })
    })
    onChange(entryId, next)
  }

  const display = value === Math.round(value) ? String(Math.round(value)) : value.toFixed(1)

  return (
    <div className="qty-stepper">
      <button onClick={() => update(value - 0.5)} title="Less"><Icon name="minus" size={9} /></button>
      <span className="qty-val">{display}×</span>
      <button onClick={() => update(value + 0.5)} title="More"><Icon name="plus" size={9} /></button>
    </div>
  )
}
