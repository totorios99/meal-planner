'use client'
import { useState } from 'react'
import { WeeklyPlanDay, WeeklyPlanMeal } from '@/types'
import { MealSlot } from './MealSlot'
import { DayAnalytics } from './DayAnalytics'
import { MacroTargets } from '@/lib/useMacroTargets'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MAX_SLOTS = 6

interface Props {
  day: WeeklyPlanDay
  planId: number
  targets: MacroTargets
  onDayUpdate: (updatedDay: WeeklyPlanDay) => void
}

export function DayCard({ day, planId, targets, onDayUpdate }: Props) {
  const [justificationDraft, setJustificationDraft] = useState(day.justification)

  const slots: (WeeklyPlanMeal | undefined)[] = Array.from({ length: MAX_SLOTS }, (_, i) =>
    day.meals.find(m => m.slotIndex === i)
  )
  const lastFilled = slots.reduce((last, s, i) => s ? i : last, -1)
  const visibleSlots = Math.min(MAX_SLOTS, Math.max(2, lastFilled + 2))

  const showWatermark = day.isDismissed || day.meals.length === 0

  async function toggleDismiss() {
    const res = await fetch(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDismissed: !day.isDismissed })
    })
    const updated = await res.json()
    onDayUpdate(updated)
  }

  async function saveJustification() {
    if (justificationDraft === day.justification) return
    const res = await fetch(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification: justificationDraft })
    })
    const updated = await res.json()
    onDayUpdate(updated)
  }

  function handleAdd(slotIndex: number, entry: WeeklyPlanMeal) {
    const updated = { ...day, meals: [...day.meals.filter(m => m.slotIndex !== slotIndex), entry] }
    onDayUpdate(updated)
  }

  function handleRemove(entryId: number) {
    const updated = { ...day, meals: day.meals.filter(m => m.id !== entryId) }
    onDayUpdate(updated)
  }

  function handleMultiplierChange(entryId: number, newMultiplier: number) {
    const updated = {
      ...day,
      meals: day.meals.map(m => m.id === entryId ? { ...m, portionMultiplier: newMultiplier } : m)
    }
    onDayUpdate(updated)
  }

  const totals = day.meals.reduce((acc, wpm) => ({
    calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
    protein: acc.protein + wpm.meal.protein * wpm.portionMultiplier,
    carbs: acc.carbs + wpm.meal.carbs * wpm.portionMultiplier,
    fats: acc.fats + wpm.meal.fats * wpm.portionMultiplier,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  return (
    <div className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-2 min-w-0 relative">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900 text-sm">{DAY_NAMES[day.dayIndex]}</div>
        <button
          onClick={toggleDismiss}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
            day.isDismissed
              ? 'bg-orange-100 border-orange-300 text-orange-700'
              : 'border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-600'
          }`}
        >
          {day.isDismissed ? 'Dismissed' : 'Dismiss'}
        </button>
      </div>

      <div className="flex flex-col gap-2 relative">
        {slots.slice(0, visibleSlots).map((slot, i) => (
          <MealSlot
            key={i}
            slot={slot}
            slotIndex={i}
            planId={planId}
            dayId={day.id}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onMultiplierChange={handleMultiplierChange}
          />
        ))}

        {/* Watermark overlay */}
        {showWatermark && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-3 z-10">
            <div className="text-3xl mb-2 opacity-30">
              {day.isDismissed ? '🚫' : '📝'}
            </div>
            <textarea
              value={justificationDraft}
              onChange={e => setJustificationDraft(e.target.value)}
              onBlur={saveJustification}
              placeholder={day.isDismissed ? 'What happened today?' : 'Add a note for this day…'}
              className="w-full text-xs text-center text-gray-600 bg-transparent border border-dashed border-gray-300 rounded-lg p-2 resize-none h-16 focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
            />
          </div>
        )}
      </div>

      {/* Totals */}
      {day.meals.length > 0 && !showWatermark && (
        <DayAnalytics totals={totals} targets={targets} />
      )}
    </div>
  )
}
