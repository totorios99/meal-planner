'use client'
import { useState } from 'react'

interface Props {
  value: number
  entryId: number
  planId: number
  dayId: number
  onChange: (entryId: number, newMultiplier: number) => void
}

export function PortionInput({ value, entryId, planId, dayId, onChange }: Props) {
  const [local, setLocal] = useState(String(value))

  async function handleBlur() {
    const num = parseFloat(local)
    if (isNaN(num) || num <= 0) { setLocal(String(value)); return }
    await fetch(`/api/plans/${planId}/days/${dayId}/meals/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portionMultiplier: num })
    })
    onChange(entryId, num)
  }

  return (
    <input
      type="number"
      min="0.1"
      step="0.1"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
      className="w-16 text-xs text-center border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5 text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800"
      title="Portion multiplier"
    />
  )
}
