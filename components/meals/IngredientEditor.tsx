'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { sumIngredients, type Ingredient, type Macros } from '@/lib/recipe'
import type { LibraryIngredient } from '@/types'

interface Props {
  value: Ingredient[]
  onChange: (next: Ingredient[]) => void
}

// Editing model: strings, so decimals type cleanly (parent gets numbers via onChange).
type Row = { name: string; quantity: string; unit: string; calories: string; protein: string; carbs: string; fats: string }

const MACRO_FIELDS = ['calories', 'protein', 'carbs', 'fats'] as const
const EMPTY_ROW: Row = { name: '', quantity: '1', unit: '', calories: '', protein: '', carbs: '', fats: '' }

function toRow(i: Ingredient): Row {
  return {
    name: i.name, quantity: str(i.quantity), unit: i.unit,
    calories: str(i.calories), protein: str(i.protein), carbs: str(i.carbs), fats: str(i.fats),
  }
}
function str(n: number): string { return n === 0 ? '' : String(n) }
function n(s: string): number { const v = Number(s); return Number.isFinite(v) ? v : 0 }

function rowToIngredient(r: Row): Ingredient {
  return {
    name: r.name.trim(), quantity: n(r.quantity), unit: r.unit.trim(),
    calories: n(r.calories), protein: n(r.protein), carbs: n(r.carbs), fats: n(r.fats),
  }
}

// Library stores per-unit macros; a line-item is absolute for its quantity.
function isSynthetic(name: string): boolean {
  return name.startsWith('(')
}

export function IngredientEditor({ value, onChange }: Props) {
  // Uncontrolled after mount: seed once, emit on edit. Parent is not a two-way binding.
  const [rows, setRows] = useState<Row[]>(() => value.length ? value.map(toRow) : [{ ...EMPTY_ROW }])
  const [library, setLibrary] = useState<LibraryIngredient[]>([])
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    fetch('/api/ingredients').then(r => r.json()).then(setLibrary).catch(() => {})
  }, [])

  function commit(next: Row[]) {
    setRows(next)
    onChangeRef.current(next.map(rowToIngredient).filter(i => i.name || i.calories || i.protein || i.carbs || i.fats))
  }

  function setField(idx: number, field: keyof Row, val: string) {
    const next = rows.map((r, i) => {
      if (i !== idx) return r
      // Changing quantity scales absolute macros linearly from the old quantity.
      if (field === 'quantity') {
        const oldQ = n(r.quantity), newQ = n(val)
        if (oldQ > 0 && newQ > 0 && newQ !== oldQ) {
          const f = newQ / oldQ
          return {
            ...r, quantity: val,
            calories: str(round(n(r.calories) * f)), protein: str(round(n(r.protein) * f)),
            carbs: str(round(n(r.carbs) * f)), fats: str(round(n(r.fats) * f)),
          }
        }
        return { ...r, quantity: val }
      }
      return { ...r, [field]: val }
    })
    commit(next)
  }

  // On name blur, prefill from library if this is a fresh row (no macros yet).
  function onNameBlur(idx: number) {
    const r = rows[idx]
    const match = library.find(l => l.name.toLowerCase() === r.name.trim().toLowerCase())
    const noMacros = !n(r.calories) && !n(r.protein) && !n(r.carbs) && !n(r.fats)
    if (match && noMacros) {
      const q = n(r.quantity) || 1
      const next = rows.map((row, i) => i === idx ? {
        ...row, unit: row.unit || match.unit, quantity: str(q) || '1',
        calories: str(round(match.calories * q)), protein: str(round(match.protein * q)),
        carbs: str(round(match.carbs * q)), fats: str(round(match.fats * q)),
      } : row)
      commit(next)
    } else {
      saveToLibrary(r)
    }
  }

  // Fire-and-forget: grow the library with per-unit macros (absolute / quantity).
  function saveToLibrary(r: Row) {
    const name = r.name.trim()
    const q = n(r.quantity)
    const hasMacros = n(r.calories) || n(r.protein) || n(r.carbs) || n(r.fats)
    if (!name || isSynthetic(name) || q <= 0 || !hasMacros) return
    fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, unit: r.unit.trim(),
        calories: n(r.calories) / q, protein: n(r.protein) / q, carbs: n(r.carbs) / q, fats: n(r.fats) / q,
      }),
    }).catch(() => {})
  }

  function addRow() { commit([...rows, { ...EMPTY_ROW }]) }
  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx)
    commit(next.length ? next : [{ ...EMPTY_ROW }])
  }

  const subtotal: Macros = sumIngredients(rows.map(rowToIngredient))

  return (
    <div className="ing-editor">
      <datalist id="ingredient-library">
        {library.map(l => <option key={l.id} value={l.name} />)}
      </datalist>

      <div className="ing-head">
        <span>Ingredient</span><span>Qty</span><span>Unit</span>
        <span>kcal</span><span>P</span><span>C</span><span>F</span><span />
      </div>

      {rows.map((r, idx) => (
        <div className="ing-row" key={idx}>
          <input
            className="ing-name" list="ingredient-library" placeholder="e.g. brown rice"
            value={r.name} onChange={e => setField(idx, 'name', e.target.value)} onBlur={() => onNameBlur(idx)}
          />
          <input className="ing-num" type="number" min="0" step="any" placeholder="1"
            value={r.quantity} onChange={e => setField(idx, 'quantity', e.target.value)} />
          <input className="ing-unit" placeholder="g" value={r.unit}
            onChange={e => setField(idx, 'unit', e.target.value)} onBlur={() => saveToLibrary(rows[idx])} />
          {MACRO_FIELDS.map(f => (
            <input key={f} className="ing-num" type="number" min="0" step="any" placeholder="0"
              value={r[f]} onChange={e => setField(idx, f, e.target.value)} onBlur={() => saveToLibrary(rows[idx])} />
          ))}
          <button type="button" className="ing-del" onClick={() => removeRow(idx)} title="Remove">
            <Icon name="x" size={11} />
          </button>
        </div>
      ))}

      <div className="ing-foot">
        <button type="button" className="ing-add" onClick={addRow}>
          <Icon name="plus" size={12} /> Add ingredient
        </button>
        <span className="ing-total">
          {Math.round(subtotal.calories)} kcal · {Math.round(subtotal.protein)}P {Math.round(subtotal.carbs)}C {Math.round(subtotal.fats)}F
        </span>
      </div>
    </div>
  )
}

function round(x: number): number { return Math.round(x * 100) / 100 }
