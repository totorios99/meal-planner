'use client'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Tooltip } from '@/components/ui/Tooltip'
import { Select } from '@/components/ui/Select'
import { foodsMap, refMacros, sumRefs, type IngredientRef, type Macros } from '@/lib/recipe'
import type { FoodRow } from '@/types'

interface Props {
  value: IngredientRef[]
  foods: FoodRow[]
  onChange: (next: IngredientRef[]) => void
  onValidChange?: (valid: boolean) => void
}

// Editing model: quantity as a string so decimals type cleanly; name is the typeahead draft.
type Row = { foodId: number; name: string; quantity: string; measure: string }

function n(s: string): number { const v = Number(s); return Number.isFinite(v) ? v : 0 }

// Macros are DERIVED from the picked food — never typed here. You pick a food, a measure,
// and a quantity; the Foods section is the only place macros are authored.
export function FoodPicker({ value, foods, onChange, onValidChange }: Props) {
  const map = useMemo(() => foodsMap(foods), [foods])
  const [rows, setRows] = useState<Row[]>(() =>
    value.map(r => ({ foodId: r.foodId, name: map.get(r.foodId)?.name ?? '', quantity: r.foodId ? String(r.quantity) : '', measure: r.measure }))
  )

  function commit(next: Row[]) {
    setRows(next)
    onChange(
      next.filter(r => r.foodId > 0).map(r => ({ foodId: r.foodId, quantity: n(r.quantity) || 0, measure: r.measure }))
    )
    // A row with typed text that never resolved (typo, or blocked as a duplicate) would
    // otherwise be silently dropped from the saved ingredients — block saving instead.
    onValidChange?.(next.every(r => r.foodId > 0 || r.name.trim().length === 0))
  }

  function setRow(idx: number, patch: Partial<Row>) {
    commit(rows.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  // Resolve the typed name to a food on change; default the measure to the food's base unit.
  function onNameChange(idx: number, name: string) {
    const food = foods.find(f => f.name.toLowerCase() === name.trim().toLowerCase())
    if (!food) { setRow(idx, { name, foodId: 0 }); return }
    if (rows.some((r, i) => i !== idx && r.foodId === food.id)) {
      // Already in the list — block the resolve instead of silently double-counting the food.
      setRow(idx, { name, foodId: 0 })
      return
    }
    // A measure carried over from whatever food was previously in this row (e.g. "1/3") may not
    // exist on the newly picked food — keep it only if it's still valid, else fall back to base.
    const prevMeasure = rows[idx].measure
    const measureStillValid = !prevMeasure || prevMeasure === food.baseUnit || food.measures.some(m => m.unit === prevMeasure)
    setRow(idx, {
      name,
      foodId: food.id,
      measure: measureStillValid ? (prevMeasure || food.baseUnit || 'unit') : (food.baseUnit || 'unit'),
      quantity: rows[idx].quantity.trim() ? rows[idx].quantity : '1',
    })
  }

  function measureOptions(foodId: number, current: string): string[] {
    const food = map.get(foodId)
    if (!food) return current ? [current] : []
    const base = food.baseUnit || 'unit'
    const opts = [base, ...food.measures.map(m => m.unit).filter(u => u !== base)]
    // Keep a stored-but-removed measure visible so it isn't silently swapped for the base.
    if (current && !opts.includes(current)) opts.unshift(current)
    return opts
  }

  function rowMacros(r: Row): Macros {
    return refMacros({ foodId: r.foodId, quantity: n(r.quantity), measure: r.measure }, map.get(r.foodId))
  }

  const subtotal = sumRefs(
    rows.filter(r => r.foodId > 0).map(r => ({ foodId: r.foodId, quantity: n(r.quantity), measure: r.measure })),
    map
  )

  return (
    <div className="fp-editor">
      <datalist id="food-options">
        {foods.map(f => <option key={f.id} value={f.name} />)}
      </datalist>

      <div className="fp-head">
        <span>Food</span><span>Qty</span><span>Measure</span><span>Macros</span><span />
      </div>

      {rows.map((r, idx) => {
        const m = rowMacros(r)
        const opts = measureOptions(r.foodId, r.measure)
        const trimmedName = r.name.trim().toLowerCase()
        const duplicate = !r.foodId && trimmedName.length > 0 && foods.some(f => f.name.toLowerCase() === trimmedName)
        // A name typed with no matching food won't be saved — flag it instead of dropping silently.
        const unmatched = !r.foodId && r.name.trim().length > 0 && !duplicate
        return (
          <div className={`fp-row${unmatched || duplicate ? ' fp-unmatched' : ''}`} key={idx}>
            <input
              className="fp-name" list="food-options" placeholder="search food…"
              value={r.name} onChange={e => onNameChange(idx, e.target.value)}
            />
            <input
              className="fp-qty" type="number" min="0" step="any" placeholder="1"
              value={r.quantity} onChange={e => setRow(idx, { quantity: e.target.value })}
            />
            <Select
              className="fp-measure" value={r.measure}
              onChange={v => setRow(idx, { measure: v })}
              disabled={!r.foodId}
              options={opts.length === 0 ? [{ value: '', label: '—' }] : opts.map(u => ({ value: u, label: u }))}
            />
            <Tooltip label={duplicate ? 'Already in this list' : unmatched ? 'No such food — add it in the Foods section first' : 'Derived from the food — edit in Foods'}>
              <span className="fp-macros">
                {r.foodId
                  ? `${Math.round(m.calories)} kcal · ${Math.round(m.protein)}P ${Math.round(m.carbs)}C ${Math.round(m.fats)}F`
                  : duplicate ? 'already added' : unmatched ? 'not in Foods' : 'pick a food'}
              </span>
            </Tooltip>
            <Tooltip label="Remove">
              <button type="button" className="ing-del" aria-label="Remove" onClick={() => commit(rows.filter((_, i) => i !== idx))}>
                <Icon name="x" size={11} />
              </button>
            </Tooltip>
          </div>
        )
      })}

      <div className="fp-foot">
        <button type="button" className="ing-add" onClick={() => setRows(rs => [...rs, { foodId: 0, name: '', quantity: '1', measure: '' }])}>
          <Icon name="plus" size={12} /> Add ingredient
        </button>
        <span className="ing-total">
          {Math.round(subtotal.calories)} kcal · {Math.round(subtotal.protein)}P {Math.round(subtotal.carbs)}C {Math.round(subtotal.fats)}F
        </span>
      </div>
    </div>
  )
}
