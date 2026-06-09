'use client'
import { useState } from 'react'
import { WeeklyPlanMeal, Meal } from '@/types'
import { MealPicker } from './MealPicker'
import { PortionInput } from './PortionInput'
import { Icon } from '@/components/Icon'

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
        <button className="add-meal-btn" onClick={() => setPicking(true)}>
          <Icon name="plus" size={12} /> Add meal
        </button>
        {picking && <MealPicker onSelect={handlePick} onClose={() => setPicking(false)} />}
      </>
    )
  }

  const kcal = Math.round(slot.meal.calories * slot.portionMultiplier)

  return (
    <>
      <div className="plan-meal">
        <button className="plan-meal-remove" onClick={() => onRemove(slot.id)} title="Remove">
          <Icon name="x" size={10} />
        </button>
        <div className="plan-meal-name" onClick={() => setPicking(true)} style={{ cursor: 'pointer' }}>
          {slot.meal.title}
        </div>
        <div className="plan-meal-row">
          <span className="plan-meal-kcal">{kcal} kcal</span>
          <PortionInput
            value={slot.portionMultiplier}
            entryId={slot.id}
            planId={planId}
            dayId={dayId}
            onChange={onMultiplierChange}
          />
        </div>
      </div>
      {picking && <MealPicker onSelect={handlePick} onClose={() => setPicking(false)} />}
    </>
  )
}
