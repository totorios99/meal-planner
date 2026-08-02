'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { WeeklyPlanDay, WeeklyPlanMeal, Meal, FoodRow } from '@/types'
import { DayAnalytics } from './DayAnalytics'
import { MealPicker } from './MealPicker'
import { FoodPicker } from '@/components/meals/FoodPicker'
import { parseRefs, sumRefs, sumEntries, foodsMap, hasUnfilledIngredient, type IngredientRef } from '@/lib/recipe'
import { localDate, dayName } from '@/lib/date'
import type { MacroTargets } from '@/lib/settings'
import { Icon } from '@/components/Icon'

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
  // Pending debounced ingredient saves — the payload is kept alongside the timer so an
  // unmount can still flush it (see the effect below).
  const saveTimers = useRef<Record<number, { timer: ReturnType<typeof setTimeout>; refs: IngredientRef[] }>>({})
  const [banner, setBanner] = useState<{ entryId: number; warnings: string[] } | null>(null)
  const [ingredientsValid, setIngredientsValid] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const date = localDate(weekStart, day.dayIndex)
  const isToday = date.toDateString() === new Date().toDateString()

  const sortedMeals = [...day.meals].sort((a, b) => a.slotIndex - b.slotIndex)

  // Every mutation below goes through this. Without it a 500 put the API's `{error: "…"}`
  // straight into day state, and the next render threw on `day.meals` being undefined —
  // one failed request white-screened the whole planner.
  async function send<T>(url: string, init: RequestInit): Promise<T | null> {
    try {
      const res = await fetch(url, init)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(typeof body?.error === 'string' ? body.error : 'Could not save that change. Try again.')
        return null
      }
      return await res.json().catch(() => null) as T | null
    } catch {
      setError('Network error — that change was not saved.')
      return null
    }
  }

  async function toggleOff() {
    const body: Record<string, unknown> = { isDismissed: !day.isDismissed }
    if (day.isDismissed) body.justification = ''
    const updated = await send<WeeklyPlanDay>(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!updated) return
    if (day.isDismissed) setNoteDraft('')
    onDayUpdate(updated)
  }

  async function saveNote() {
    if (noteDraft === day.justification) return
    const updated = await send<WeeklyPlanDay>(`/api/plans/${planId}/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification: noteDraft })
    })
    if (!updated) return
    onDayUpdate({ ...updated, meals: day.meals })
  }

  async function handlePick(meal: Meal) {
    const replacing = typeof picking === 'number' ? day.meals.find(m => m.id === picking) : undefined
    setPicking(null)
    // Add the replacement BEFORE removing the old entry — the reverse order used to delete
    // first, so a failed POST left the slot empty with nothing to undo it.
    const created = await send<WeeklyPlanMeal & { warnings?: string[] }>(
      `/api/plans/${planId}/days/${day.id}/meals`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId: meal.id, slotIndex: replacing?.slotIndex ?? sortedMeals.length })
      }
    )
    if (!created) return
    const { warnings, ...entry } = created
    if (replacing) {
      const removed = await send(`/api/plans/${planId}/days/${day.id}/meals/${replacing.id}`, { method: 'DELETE' })
      // A failed delete leaves both in the slot rather than losing the new one — visible, fixable.
      if (removed === null) return onDayUpdate({ ...day, meals: [...day.meals, entry] })
    }
    onDayUpdate({ ...day, meals: [...day.meals.filter(m => m.id !== replacing?.id), entry] })
    if (warnings?.length) setBanner({ entryId: entry.id, warnings })
  }

  async function handleRemove(entryId: number) {
    if (await send(`/api/plans/${planId}/days/${day.id}/meals/${entryId}`, { method: 'DELETE' }) === null) return
    onDayUpdate({ ...day, meals: day.meals.filter(m => m.id !== entryId) })
  }

  // Live recalc: update local snapshot immediately, debounce the PUT (editor fires per keystroke).
  function handleIngredientsChange(entryId: number, next: IngredientRef[]) {
    const json = JSON.stringify(next)
    onDayUpdate({ ...day, meals: day.meals.map(m => m.id === entryId ? { ...m, ingredients: json } : m) })
    clearTimeout(saveTimers.current[entryId]?.timer)
    saveTimers.current[entryId] = {
      refs: next,
      timer: setTimeout(() => {
        delete saveTimers.current[entryId]
        send(`/api/plans/${planId}/days/${day.id}/meals/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: next })
        })
      }, 600)
    }
  }

  // Flush pending ingredient saves on unmount — navigating away inside the 600ms debounce
  // used to drop the edit silently while the UI had already shown it applied. keepalive lets
  // the request outlive the page.
  useEffect(() => {
    const pending = saveTimers.current
    const url = (entryId: string) => `/api/plans/${planId}/days/${day.id}/meals/${entryId}`
    return () => {
      for (const [entryId, p] of Object.entries(pending)) {
        clearTimeout(p.timer)
        fetch(url(entryId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: p.refs }),
          keepalive: true,
        }).catch(() => {})
      }
    }
  }, [planId, day.id])

  async function handleReorder(fromIdx: number, toIdx: number) {
    const reordered = [...sortedMeals]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = reordered.map((m, i) => ({ ...m, slotIndex: i }))
    onDayUpdate({ ...day, meals: updated })
    await send(`/api/plans/${planId}/days/${day.id}/meals/reorder`, {
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

  const totals = sumEntries(day.meals, fmap)

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
          <div className="day-name">{dayName(date)}</div>
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
                <div className="plan-meal-thumb">
                  {entry.meal.imageUrl && <img src={entry.meal.imageUrl} alt="" />}
                </div>
                <button
                  className="plan-meal-remove"
                  onClick={() => handleRemove(entry.id)}
                  title="Remove"
                >
                  <Icon name="x" size={10} />
                </button>
                <button
                  type="button"
                  className="plan-meal-name"
                  onClick={() => { setExpanded(expanded === entry.id ? null : entry.id); setIngredientsValid(true) }}
                  title={`${entry.meal.title} — click to edit ingredients`}
                >
                  {entry.meal.title}
                  {needsInput && (
                    <span
                      className="plan-meal-veg-warning"
                      title="This meal has an unfilled ingredient — tap the meal to add it"
                    >
                      <Icon name="warning" size={12} />
                    </span>
                  )}
                </button>
                <div className="plan-meal-row">
                  <span className="plan-meal-kcal">{kcal} kcal</span>
                  <button
                    className="plan-meal-edit"
                    onClick={() => setPicking(entry.id)}
                    title="Swap meal"
                  >
                    <Icon name="swap" size={11} /> swap
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic', padding: 0 }}
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
              <h2 className="sheet-title">{expandedEntry.meal.title} — {dayName(date)}</h2>
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

      {error && createPortal(
        <div className="fixed-alert" role="alert">
          <Icon name="warning" size={16} />
          <div className="fixed-alert-body"><p>{error}</p></div>
          <button className="icon-btn" onClick={() => setError(null)} title="Dismiss">
            <Icon name="x" size={14} />
          </button>
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
