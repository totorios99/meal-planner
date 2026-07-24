'use client'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { WeeklyPlanDay, WeeklyPlanMeal, Meal, FoodRow } from '@/types'
import { DayAnalytics } from './DayAnalytics'
import { MealPicker } from './MealPicker'
import { FoodPicker } from '@/components/meals/FoodPicker'
import { parseRefs, sumRefs, foodsMap, hasUnfilledIngredient, type IngredientRef } from '@/lib/recipe'
import { MacroTargets } from '@/lib/useMacroTargets'
import { Icon } from '@/components/Icon'

const DAY_ABBR = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  day: WeeklyPlanDay
  planId: number
  targets: MacroTargets
  foods: FoodRow[]
  weekStart: string
  onDayUpdate: (updatedDay: WeeklyPlanDay) => void
}

export function DayCard({ day, planId, targets, foods, weekStart, onDayUpdate }: Props) {
  const fmap = foodsMap(foods)
  const [noteDraft, setNoteDraft] = useState(day.justification)
  const [showNote, setShowNote] = useState(false)
  // null = closed, 'add' = new meal, number = entry id to replace
  const [picking, setPicking] = useState<'add' | number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const [banner, setBanner] = useState<{ entryId: number; warnings: string[] } | null>(null)
  const [ingredientsValid, setIngredientsValid] = useState(true)

  const [wy, wm, wd] = weekStart.split('T')[0].split('-').map(Number)
  const date = new Date(wy, wm - 1, wd + day.dayIndex)
  const isToday = date.toDateString() === new Date().toDateString()

  const sortedMeals = [...day.meals].sort((a, b) => a.slotIndex - b.slotIndex)

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

  async function handlePick(meal: Meal) {
    if (picking === 'add') {
      const res = await fetch(`/api/plans/${planId}/days/${day.id}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId: meal.id, slotIndex: sortedMeals.length })
      })
      const { warnings, ...entry } = await res.json() as WeeklyPlanMeal & { warnings?: string[] }
      onDayUpdate({ ...day, meals: [...day.meals, entry] })
      if (warnings?.length) setBanner({ entryId: entry.id, warnings })
    } else if (typeof picking === 'number') {
      const existing = day.meals.find(m => m.id === picking)
      await fetch(`/api/plans/${planId}/days/${day.id}/meals/${picking}`, { method: 'DELETE' })
      const res = await fetch(`/api/plans/${planId}/days/${day.id}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId: meal.id, slotIndex: existing?.slotIndex ?? sortedMeals.length })
      })
      const { warnings, ...entry } = await res.json() as WeeklyPlanMeal & { warnings?: string[] }
      onDayUpdate({ ...day, meals: [...day.meals.filter(m => m.id !== picking), entry] })
      if (warnings?.length) setBanner({ entryId: entry.id, warnings })
    }
    setPicking(null)
  }

  async function handleRemove(entryId: number) {
    const res = await fetch(`/api/plans/${planId}/days/${day.id}/meals/${entryId}`, { method: 'DELETE' })
    if (!res.ok) return
    onDayUpdate({ ...day, meals: day.meals.filter(m => m.id !== entryId) })
  }

  // Live recalc: update local snapshot immediately, debounce the PUT (editor fires per keystroke).
  function handleIngredientsChange(entryId: number, next: IngredientRef[]) {
    const json = JSON.stringify(next)
    onDayUpdate({ ...day, meals: day.meals.map(m => m.id === entryId ? { ...m, ingredients: json } : m) })
    clearTimeout(saveTimers.current[entryId])
    saveTimers.current[entryId] = setTimeout(() => {
      fetch(`/api/plans/${planId}/days/${day.id}/meals/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: next })
      })
    }, 600)
  }

  async function handleReorder(fromIdx: number, toIdx: number) {
    const reordered = [...sortedMeals]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = reordered.map((m, i) => ({ ...m, slotIndex: i }))
    onDayUpdate({ ...day, meals: updated })
    await fetch(`/api/plans/${planId}/days/${day.id}/meals/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated.map(m => ({ id: m.id, slotIndex: m.slotIndex })))
    })
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDropIdx(idx)
  }

  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== idx) handleReorder(dragIdx, idx)
    setDragIdx(null)
    setDropIdx(null)
  }

  function onDragEnd() {
    setDragIdx(null)
    setDropIdx(null)
  }

  const totals = day.meals.reduce((acc, wpm) => {
    const m = sumRefs(parseRefs(wpm.ingredients), fmap)
    return {
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fats:     acc.fats     + m.fats,
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })

  const hasNote = noteDraft.trim().length > 0
  const expandedEntry = expanded !== null ? day.meals.find(m => m.id === expanded) : undefined

  // Auto-dismiss the one-time banner once its meal no longer has an unfilled ingredient —
  // no need to wait for a manual dismiss if the user already fixed it.
  const bannerEntry = banner ? day.meals.find(m => m.id === banner.entryId) : undefined
  const showBanner = !!banner && !!bannerEntry && hasUnfilledIngredient(parseRefs(bannerEntry.ingredients), fmap)

  return (
    <div className={`day-col${day.isDismissed ? ' off' : ''}${isToday ? ' today' : ''}`}>
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
          {sortedMeals.map((entry, i) => {
            const refs = parseRefs(entry.ingredients)
            const kcal = Math.round(sumRefs(refs, fmap).calories)
            const needsInput = hasUnfilledIngredient(refs, fmap)
            const isDragging = dragIdx === i
            const isDropTarget = dropIdx === i && dragIdx !== i
            return (
              <div
                key={entry.id}
                className={`plan-meal${isDragging ? ' dragging' : ''}${isDropTarget ? ' drop-target' : ''}`}
                draggable
                onDragStart={e => onDragStart(e, i)}
                onDragOver={e => onDragOver(e, i)}
                onDrop={e => onDrop(e, i)}
                onDragEnd={onDragEnd}
              >
                <span className="plan-meal-drag"><Icon name="drag" size={12} /></span>
                <button
                  className="plan-meal-remove"
                  onClick={() => handleRemove(entry.id)}
                  title="Remove"
                >
                  <Icon name="x" size={10} />
                </button>
                <div
                  className="plan-meal-name"
                  onClick={() => setPicking(entry.id)}
                  style={{ cursor: 'pointer' }}
                  title="Swap for another recipe"
                >
                  {entry.meal.title}
                  {needsInput && (
                    <span
                      className="plan-meal-veg-warning"
                      title="This meal has an unfilled ingredient — tap edit to add it"
                    >
                      <Icon name="warning" size={12} />
                    </span>
                  )}
                </div>
                <div className="plan-meal-row">
                  <span className="plan-meal-kcal">{kcal} kcal</span>
                  <button
                    className="plan-meal-edit"
                    onClick={() => { setExpanded(expanded === entry.id ? null : entry.id); setIngredientsValid(true) }}
                    title="Edit ingredients"
                  >
                    <Icon name="edit" size={11} /> edit
                  </button>
                </div>
              </div>
            )
          })}

          <button className="add-meal-btn" onClick={() => setPicking('add')}>
            <Icon name="plus" size={12} /> Add meal
          </button>
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

      {picking !== null && (
        <MealPicker onSelect={handlePick} onClose={() => setPicking(null)} />
      )}

      {expandedEntry && createPortal(
        <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) setExpanded(null) }}>
          <div className="sheet">
            <div className="sheet-head">
              <h2 className="sheet-title">{expandedEntry.meal.title} — {DAY_ABBR[day.dayIndex]}</h2>
              <button className="icon-btn" onClick={() => setExpanded(null)} title="Close">
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="sheet-body">
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
                Edits apply to this day only — the recipe and other days are untouched.
              </p>
              <FoodPicker
                key={`${expandedEntry.id}-${foods.length > 0}`}
                value={parseRefs(expandedEntry.ingredients)}
                foods={foods}
                onChange={next => handleIngredientsChange(expandedEntry.id, next)}
                onValidChange={setIngredientsValid}
              />
            </div>
            <div className="sheet-foot">
              <button className="btn btn-primary" disabled={!ingredientsValid}
                title={!ingredientsValid ? 'Fix the highlighted ingredient row first' : undefined}
                onClick={() => { setExpanded(null); setIngredientsValid(true) }}>
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showBanner && banner && createPortal(
        <div className="fixed-alert">
          <Icon name="warning" size={16} />
          <div className="fixed-alert-body">
            {banner.warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
          <button className="icon-btn" onClick={() => setBanner(null)} title="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
