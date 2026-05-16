'use client'
import { useState } from 'react'
import { WeeklyPlanMeal, Meal } from '@/types'
import { MealPicker } from './MealPicker'
import { PortionInput } from './PortionInput'

interface Props {
  slot: WeeklyPlanMeal | undefined
  slotIndex: number
  planId: number
  dayId: number
  onAdd: (slotIndex: number, entry: WeeklyPlanMeal) => void
  onRemove: (entryId: number) => void
  onMultiplierChange: (entryId: number, newMultiplier: number) => void
}

export function MealSlot({ slot, slotIndex, planId, dayId, onAdd, onRemove, onMultiplierChange }: Props) {
  const [picking, setPicking] = useState(false)

  async function handlePick(meal: Meal) {
    if (slot) {
      // Hot-swap: delete old slot first, then add new
      await fetch(`/api/plans/${planId}/days/${dayId}/meals/${slot.id}`, { method: 'DELETE' })
      onRemove(slot.id)
    }
    const res = await fetch(`/api/plans/${planId}/days/${dayId}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealId: meal.id, slotIndex })
    })
    const entry: WeeklyPlanMeal = await res.json()
    onAdd(slotIndex, entry)
  }

  if (!slot) {
    return (
      <>
        <button
          onClick={() => setPicking(true)}
          className="w-full border border-dashed border-gray-300 rounded-xl p-3 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
        >
          + Add Meal
        </button>
        {picking && <MealPicker onSelect={handlePick} onClose={() => setPicking(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="border border-gray-200 rounded-xl p-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setPicking(true)}
            className="text-left flex-1 min-w-0"
          >
            <div className="text-sm font-medium text-gray-900 truncate">{slot.meal.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {Math.round(slot.meal.calories * slot.portionMultiplier)} kcal
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <PortionInput
              value={slot.portionMultiplier}
              entryId={slot.id}
              planId={planId}
              dayId={dayId}
              onChange={onMultiplierChange}
            />
            <span className="text-xs text-gray-400">×</span>
            <button
              onClick={() => onRemove(slot.id)}
              className="text-gray-300 hover:text-red-500 text-lg leading-none ml-1"
            >
              &times;
            </button>
          </div>
        </div>
      </div>
      {picking && <MealPicker onSelect={handlePick} onClose={() => setPicking(false)} />}
    </>
  )
}
