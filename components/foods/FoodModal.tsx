'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSheetTransition } from '@/lib/useExitTransition'
import { Tooltip } from '@/components/ui/Tooltip'
import { Icon } from '@/components/Icon'
import { CANONICAL_NUTRIENTS, pieceMeasure } from '@/lib/recipe'
import type { FoodRow } from '@/types'

interface Props {
  food?: FoodRow | null
  onClose: () => void
  onSaved: () => void
}

type Group = 'macro' | 'micro' | 'other'
// The 4 core macros meal cards/day totals/print rely on — locked derives from key so it can't
// drift out of sync (only CANONICAL_NUTRIENTS rows are ever constructed with a key set).
type NutrientRow = { key?: string; label: string; unit: string; amount: string; group: Group }
type MeasureRow = { unit: string; perBase: string }

const CANONICAL_KEYS = new Set(CANONICAL_NUTRIENTS.map(c => c.key))
const isLocked = (r: NutrientRow) => !!r.key && CANONICAL_KEYS.has(r.key)

// Editing still writes/reads per-1-baseUnit under the hood, but showing e.g. "0.89 kcal" for a
// banana reads as noise — rows are seeded and submitted in whatever piece unit the food actually
// has (banana, cookie, egg…), converted at the two edges only (seed-in, submit-out) so typing a
// decimal never fights a live round-trip conversion on every keystroke.
function round(v: number): number { return Math.round(v * 1e6) / 1e6 }

function scaleFor(food?: FoodRow | null): { factor: number; label: string; display: string } {
  return food ? pieceMeasure(food.baseUnit, food.measures) : { factor: 1, label: '', display: '' }
}

function seedRows(food?: FoodRow | null): NutrientRow[] {
  const { factor } = scaleFor(food)
  const byKey = new Map((food?.nutrients ?? []).map(n => [n.key, n]))
  const canonicalRows: NutrientRow[] = CANONICAL_NUTRIENTS.map(c => {
    const existing = byKey.get(c.key)
    return { key: c.key, label: c.label, unit: existing?.unit || c.unit, amount: existing ? String(round(existing.amount * factor)) : '', group: 'macro' }
  })
  const extraRows: NutrientRow[] = (food?.nutrients ?? [])
    .filter(n => !CANONICAL_KEYS.has(n.key))
    .map(n => ({ key: n.key, label: n.label, unit: n.unit, amount: String(round(n.amount * factor)), group: n.group ?? 'other' }))
  return [...canonicalRows, ...extraRows]
}

const EMPTY = { name: '', baseUnit: '', isPlaceholder: false }

export function FoodModal({ food, onClose, onSaved }: Props) {
  const [sheetState, close] = useSheetTransition(onClose)
  // Seeded once from the food this modal opened on. The caller passes a `key` derived from the
  // food id, so editing a different food remounts rather than syncing prop into state through
  // an effect — which rendered every open twice, once empty and once filled.
  const [form, setForm] = useState(() =>
    food ? { name: food.name, baseUnit: food.baseUnit, isPlaceholder: food.isPlaceholder } : EMPTY)
  const [nutrients, setNutrients] = useState<NutrientRow[]>(() => seedRows(food))
  const [measures, setMeasures] = useState<MeasureRow[]>(() =>
    food ? food.measures.map(m => ({ unit: m.unit, perBase: String(m.perBase) })) : [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The only error this endpoint returns is a name clash, so the name field is
  // what should say so. The nonce replays the shake on a repeat attempt.
  const [shake, setShake] = useState(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const scale = scaleFor(food)

  // Remove → reflow → re-add, so a second failed save shakes again.
  useEffect(() => {
    const el = nameRef.current
    if (!shake || !el) return
    el.classList.remove('is-shaking')
    void el.offsetWidth
    el.classList.add('is-shaking')
    const t = setTimeout(() => el.classList.remove('is-shaking'), 400)
    return () => clearTimeout(t)
  }, [shake])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  function set(field: 'name' | 'baseUnit', value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setRow(idx: number, patch: Partial<NutrientRow>) {
    setNutrients(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function renderNutrientRow(r: NutrientRow, idx: number) {
    const locked = isLocked(r)
    return (
      <div className={`nutrition-row group-${r.group}`} key={r.key ?? idx}>
        {locked ? (
          <span className="nutrition-row-label">{r.label}</span>
        ) : (
          <input className="nutrition-row-label" placeholder="e.g. Cholesterol" value={r.label}
            onChange={e => setRow(idx, { label: e.target.value })} />
        )}
        <div className="nutrition-row-values">
          <input type="number" min="0" step="any" placeholder="0" value={r.amount}
            onChange={e => setRow(idx, { amount: e.target.value })} />
          <input placeholder={locked ? r.unit : 'mg'} value={r.unit}
            onChange={e => setRow(idx, { unit: e.target.value })} />
          {!locked && (
            <Tooltip label="Remove">
              <button type="button" className="ing-del" aria-label="Remove"
                onClick={() => setNutrients(rows => rows.filter((_, i) => i !== idx))}>
                <Icon name="x" size={11} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const body = {
      ...form,
      nutrients: nutrients
        .filter(r => isLocked(r) || r.label.trim().length > 0)
        .map(r => ({
          key: isLocked(r) ? r.key : undefined,
          label: r.label.trim(),
          unit: r.unit.trim(),
          amount: (Number(r.amount) || 0) / scale.factor,
          group: r.group,
        })),
      measures: measures
        .map(m => ({ unit: m.unit.trim(), perBase: Number(m.perBase) }))
        .filter(m => m.unit && m.perBase > 0),
    }
    const res = await fetch(food ? `/api/foods/${food.id}` : '/api/foods', {
      method: food ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const b = await res.json().catch(() => null)
      setError(typeof b?.error === 'string' ? b.error : 'Could not save food')
      setShake(n => n + 1)
      return
    }
    const saved = await res.json().catch(() => null)
    // The food is already persisted at this point regardless of warnings — refresh the parent
    // list now so it isn't stale if the user dismisses via Escape/X/Cancel/backdrop instead of
    // the inline warning banner below.
    onSaved()
    if (Array.isArray(saved?.warnings) && saved.warnings.length) {
      setWarnings(saved.warnings)
      return
    }
    close()
  }

  return createPortal(
    <div className={`sheet-backdrop ${sheetState}`} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className={`sheet t-modal ${sheetState}`}>
        <div className="sheet-head">
          <h2 className="sheet-title">{food ? 'Edit food' : 'New food'}</h2>
          <Tooltip label="Close">
            <button className="icon-btn" onClick={close} aria-label="Close"><Icon name="x" size={16} /></button>
          </Tooltip>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sheet-body">
            <div className="field-grid-2">
              <div className={`field t-input-wrap${error ? ' is-error' : ''}`} style={{ marginBottom: 0 }}>
                <label htmlFor="food-name">Name</label>
                <input id="food-name" required placeholder="e.g. Brown rice"
                  ref={nameRef} className={`t-input${error ? ' is-error' : ''}`}
                  value={form.name} onChange={e => { set('name', e.target.value); setError(null) }} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="food-base">Base unit</label>
                <input id="food-base" placeholder="g" value={form.baseUnit}
                  onChange={e => set('baseUnit', e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <div className="nutrition-card">
                {/* Title + the 4 canonical macros stay pinned while a long micro/other list
                    (e.g. Avocado's 16 extras) scrolls underneath — the headline numbers
                    shouldn't scroll out of view just because the detail rows are long. */}
                <div className="nutrition-sticky-head">
                  <div className="nutrition-title-bar">
                    <span className="nutrition-title">Nutrients</span>
                    <span className="nutrition-title-unit">per {scale.display || form.baseUnit || 'unit'}</span>
                  </div>
                  {nutrients.slice(0, CANONICAL_NUTRIENTS.length).map((r, idx) => renderNutrientRow(r, idx))}
                </div>
                {nutrients.slice(CANONICAL_NUTRIENTS.length).map((r, i) => renderNutrientRow(r, i + CANONICAL_NUTRIENTS.length))}
              </div>
              <button type="button" className="ing-add" style={{ marginTop: 6 }}
                onClick={() => setNutrients(rows => [...rows, { label: '', unit: '', amount: '', group: 'other' }])}>
                <Icon name="plus" size={12} /> Add nutrient
              </button>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>Measures <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— how many {form.baseUnit || 'base units'} in each</span></label>
              {measures.map((m, i) => (
                <div className="measure-row" key={i}>
                  <input placeholder="cup" value={m.unit}
                    onChange={e => setMeasures(ms => ms.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
                  <span className="measure-eq">=</span>
                  <input type="number" min="0" step="any" placeholder="185" value={m.perBase}
                    onChange={e => setMeasures(ms => ms.map((x, j) => j === i ? { ...x, perBase: e.target.value } : x))} />
                  <span className="measure-unit">{form.baseUnit || 'unit'}</span>
                  <Tooltip label="Remove">
                    <button type="button" className="ing-del" aria-label="Remove"
                      onClick={() => setMeasures(ms => ms.filter((_, j) => j !== i))}>
                      <Icon name="x" size={11} />
                    </button>
                  </Tooltip>
                </div>
              ))}
              <button type="button" className="ing-add" style={{ marginTop: 6 }}
                onClick={() => setMeasures(ms => [...ms, { unit: '', perBase: '' }])}>
                <Icon name="plus" size={12} /> Add measure
              </button>
            </div>

            {warnings.length > 0 && (
              <p style={{ color: 'var(--warning, #b8860b)', fontSize: 13, marginTop: 12 }}>
                Saved, but: {warnings.join('; ')}. <button type="button" className="btn btn-ghost btn-sm"
                  onClick={close}>Dismiss</button>
              </p>
            )}
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>
          <div className="sheet-foot">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : food ? 'Save changes' : 'Add food'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
