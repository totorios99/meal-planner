'use client'
import { useState } from 'react'
import { WeeklyPlanDay, WeeklyPlanMeal } from '@/types'
import { MealSlot } from './MealSlot'
import { DayAnalytics } from './DayAnalytics'
import { MacroTargets } from '@/lib/useMacroTargets'
import { Icon } from '@/components/Icon'

const DAY_ABBR = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MAX_SLOTS = 6

interface Props {
  day: WeeklyPlanDay
  planId: number
  targets: MacroTargets
  weekStart: string
  onDayUpdate: (updatedDay: WeeklyPlanDay) => void
}

export function DayCard({ day, planId, targets, weekStart, onDayUpdate }: Props) {
  const [noteDraft, setNoteDraft] = useState(day.justification)
  const [showNote, setShowNote] = useState(false)

  const date = new Date(weekStart)
  date.setDate(date.getDate() + day.dayIndex)
  const isToday = date.toDateString() === new Date().toDateString()

  const slots: (WeeklyPlanMeal | undefined)[] = Array.from({ length: MAX_SLOTS }, (_, i) =>
    day.meals.find(m => m.slotIndex === i)
  )
  const lastFilled = slots.reduce((last, s, i) => s ? i : last, -1)
  const visibleSlots = Math.min(MAX_SLOTS, Math.max(1, lastFilled + 2))

  async function toggleOff() {
    const body: Record<string, unknown> = { isDismissed: !day.isDismissed }
    if (day.isDismissed) body.justification = ''
    const res = await fetch(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const updated = await res.json()
    if (day.isDismissed) setNoteDraft('')
    onDayUpdate(updated)
  }

  async function saveNote() {
    if (noteDraft === day.justification) return
    const res = await fetch(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification: noteDraft })
    })
    const updated = await res.json()
    onDayUpdate({ ...updated, meals: day.meals })
  }

  function handleAdd(slotIndex: number, entry: WeeklyPlanMeal) {
    onDayUpdate({ ...day, meals: [...day.meals.filter(m => m.slotIndex !== slotIndex), entry] })
  }

  function handleRemove(entryId: number) {
    onDayUpdate({ ...day, meals: day.meals.filter(m => m.id !== entryId) })
  }

  function handleMultiplierChange(entryId: number, newMultiplier: number) {
    onDayUpdate({ ...day, meals: day.meals.map(m => m.id === entryId ? { ...m, portionMultiplier: newMultiplier } : m) })
  }

  const totals = day.meals.reduce((acc, wpm) => ({
    calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
    protein:  acc.protein  + wpm.meal.protein  * wpm.portionMultiplier,
    carbs:    acc.carbs    + wpm.meal.carbs    * wpm.portionMultiplier,
    fats:     acc.fats     + wpm.meal.fats     * wpm.portionMultiplier,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  const hasNote = noteDraft.trim().length > 0

  return (
    <div className={`day-col${day.isDismissed ? ' off' : ''}`}>
      <div className="day-head">
        <div className="day-head-text">
          <div className="day-name">{DAY_ABBR[day.dayIndex]}</div>
          <div className="day-date">{date.getDate()}</div>
        </div>
        <button
          className="off-toggle"
          onClick={toggleOff}
          title={day.isDismissed ? 'Restore day' : 'Mark as off day'}
        >
          <Icon name={day.isDismissed ? 'trip' : 'plus'} size={13} />
        </button>
      </div>

      {day.isDismissed ? (
        <div className="off-placeholder">
          <span style={{ opacity: 0.25, display: 'flex' }}><Icon name="trip" size={28} /></span>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            onBlur={saveNote}
            placeholder="Why off? e.g. Trip, eating out"
            className="off-placeholder-input"
          />
        </div>
      ) : (
        <div className="day-body">
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

      {!day.isDismissed && day.meals.length > 0 && (
        <div className="day-foot">
          <DayAnalytics totals={totals} targets={targets} />
          <div className="day-note">
            {!showNote && !hasNote ? (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 12, fontStyle: 'italic', padding: 0 }}
                onClick={() => setShowNote(true)}
              >
                + Add note
              </button>
            ) : (
              <textarea
                autoFocus={showNote && !hasNote}
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onBlur={() => { saveNote(); if (!hasNote) setShowNote(false) }}
                placeholder="Add a note for this day…"
                rows={2}
                className="day-note-input"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
