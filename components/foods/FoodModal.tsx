'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'
import type { FoodRow } from '@/types'

interface Props {
  food?: FoodRow | null
  onClose: () => void
  onSaved: () => void
}

type MeasureRow = { unit: string; perBase: string }

const EMPTY = { name: '', baseUnit: '', calories: '', protein: '', carbs: '', fats: '' }

export function FoodModal({ food, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [measures, setMeasures] = useState<MeasureRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (food) {
      setForm({
        name: food.name,
        baseUnit: food.baseUnit,
        calories: String(food.calories),
        protein: String(food.protein),
        carbs: String(food.carbs),
        fats: String(food.fats),
      })
      setMeasures(food.measures.map(m => ({ unit: m.unit, perBase: String(m.perBase) })))
    } else {
      setForm(EMPTY)
      setMeasures([])
    }
  }, [food])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field: keyof typeof EMPTY, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const body = {
      ...form,
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
      return
    }
    onSaved()
    onClose()
  }

  const macroFields: [keyof typeof EMPTY, string][] = [
    ['calories', 'Calories'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fats', 'Fats (g)'],
  ]

  return createPortal(
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-head">
          <h2 className="sheet-title">{food ? 'Edit food' : 'New food'}</h2>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sheet-body">
            <div className="field-grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="food-name">Name</label>
                <input id="food-name" required placeholder="e.g. Brown rice"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="food-base">Base unit</label>
                <input id="food-base" placeholder="g" value={form.baseUnit}
                  onChange={e => set('baseUnit', e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>Macros <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— per 1 {form.baseUnit || 'unit'}</span></label>
              <div className="field-grid-2">
                {macroFields.map(([f, label]) => (
                  <div className="field" style={{ marginBottom: 0 }} key={f}>
                    <label htmlFor={`food-${f}`} style={{ fontSize: 11 }}>{label}</label>
                    <input id={`food-${f}`} type="number" min="0" step="any" placeholder="0"
                      value={form[f]} onChange={e => set(f, e.target.value)} />
                  </div>
                ))}
              </div>
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
                  <button type="button" className="ing-del" title="Remove"
                    onClick={() => setMeasures(ms => ms.filter((_, j) => j !== i))}>
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
              <button type="button" className="ing-add" style={{ marginTop: 6 }}
                onClick={() => setMeasures(ms => [...ms, { unit: '', perBase: '' }])}>
                <Icon name="plus" size={12} /> Add measure
              </button>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>
          <div className="sheet-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
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
