'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MacroTargets } from '@/lib/useMacroTargets'
import { Icon } from '@/components/Icon'

interface Props {
  targets: MacroTargets
  onSave: (t: MacroTargets) => void
  onClose: () => void
}

const FIELDS = [
  { key: 'calories' as const, label: 'Calories', unit: 'kcal' },
  { key: 'protein'  as const, label: 'Protein',  unit: 'g'    },
  { key: 'carbs'    as const, label: 'Carbs',     unit: 'g'    },
  { key: 'fats'     as const, label: 'Fats',      unit: 'g'    },
]

export function TargetsModal({ targets, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    calories: String(targets.calories),
    protein:  String(targets.protein),
    carbs:    String(targets.carbs),
    fats:     String(targets.fats),
  })

  function handleSave() {
    onSave({
      calories: Number(form.calories) || 2000,
      protein:  Number(form.protein)  || 150,
      carbs:    Number(form.carbs)    || 200,
      fats:     Number(form.fats)     || 65,
    })
    onClose()
  }

  return createPortal(
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" style={{ maxWidth: 400 }}>
        <div className="sheet-head">
          <h2 className="sheet-title">Daily targets</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="sheet-body">
          {FIELDS.map(f => (
            <div key={f.key} className="field" style={{ marginBottom: 14 }}>
              <label>
                {f.label} <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>({f.unit})</span>
              </label>
              <input
                type="number"
                min="0"
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
