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
  const [showNotes, setShowNotes] = useState(false)

  const slots: (WeeklyPlanMeal | undefined)[] = Array.from({ length: MAX_SLOTS }, (_, i) =>
    day.meals.find(m => m.slotIndex === i)
  )
  const lastFilled = slots.reduce((last, s, i) => s ? i : last, -1)
  const visibleSlots = Math.min(MAX_SLOTS, Math.max(1, lastFilled + 2))

  const showWatermark = day.isDismissed

  async function toggleDismiss() {
    const undismissing = day.isDismissed
    const body: Record<string, unknown> = { isDismissed: !day.isDismissed }
    if (undismissing) body.justification = ''
    const res = await fetch(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const updated = await res.json()
    if (undismissing) setJustificationDraft('')
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
    onDayUpdate({ ...updated, meals: day.meals })
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

  const hasNotes = day.justification.trim().length > 0

  return (
    <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-3 flex flex-col gap-2 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="font-semibold text-gray-900 dark:text-zinc-100 text-sm truncate">{DAY_NAMES[day.dayIndex]}</div>
        <button
          onClick={toggleDismiss}
          className={`text-xs px-2 py-0.5 rounded-full border shrink-0 transition-colors ${
            day.isDismissed
              ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
              : 'border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400'
          }`}
        >
          {day.isDismissed ? 'Dismissed' : 'Dismiss'}
        </button>
      </div>

      {/* Slots area or dismissed state */}
      {day.isDismissed ? (
        <div className="flex flex-col items-center gap-2 py-4 px-2 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-dashed border-orange-200 dark:border-orange-800">
          <span className="text-xl opacity-30">🚫</span>
          <textarea
            value={justificationDraft}
            onChange={e => setJustificationDraft(e.target.value)}
            onBlur={saveJustification}
            placeholder="What happened today?"
            rows={3}
            className="w-full text-xs text-center text-gray-600 dark:text-zinc-300 bg-transparent border border-dashed border-orange-200 dark:border-orange-800 rounded-lg p-2 resize-none focus:outline-none focus:border-orange-400 dark:focus:border-orange-600 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
        </div>
      )}

      {/* Analytics — only when meals present */}
      {day.meals.length > 0 && !day.isDismissed && (
        <DayAnalytics totals={totals} targets={targets} />
      )}

      {/* Notes — always accessible when day has meals */}
      {day.meals.length > 0 && !day.isDismissed && (
        <div className="border-t border-gray-200 dark:border-zinc-700 pt-2">
          {!showNotes && !hasNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 w-full text-left"
            >
              + Add note
            </button>
          ) : (
            <textarea
              autoFocus={showNotes && !hasNotes}
              value={justificationDraft}
              onChange={e => setJustificationDraft(e.target.value)}
              onBlur={saveJustification}
              placeholder="Add a note for this day…"
              rows={2}
              className="w-full text-xs text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 resize-none focus:outline-none focus:border-blue-300 dark:focus:border-blue-600 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          )}
        </div>
      )}
    </div>
  )
}
