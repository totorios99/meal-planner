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
      <div className="border border-gray-200 rounded-xl p-2.5 bg-white">
        <button onClick={() => setPicking(true)} className="text-left w-full">
          <div className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{slot.meal.title}</div>
        </button>
        <div className="flex items-center justify-between mt-1.5 gap-1">
          <span className="text-xs text-gray-400 shrink-0">
            {Math.round(slot.meal.calories * slot.portionMultiplier)} kcal
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-300">×</span>
            <PortionInput
              value={slot.portionMultiplier}
              entryId={slot.id}
              planId={planId}
              dayId={dayId}
              onChange={onMultiplierChange}
            />
            <button
              onClick={() => onRemove(slot.id)}
              className="text-gray-300 hover:text-red-500 text-base leading-none w-5 text-center"
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
