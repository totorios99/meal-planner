'use client'
import { useState } from 'react'
import { MacroTargets } from '@/lib/useMacroTargets'

interface Props {
  targets: MacroTargets
  onSave: (t: MacroTargets) => void
  onClose: () => void
}

export function TargetsModal({ targets, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    calories: String(targets.calories),
    protein: String(targets.protein),
    carbs: String(targets.carbs),
    fats: String(targets.fats),
  })

  function handleSave() {
    onSave({
      calories: Number(form.calories) || 2000,
      protein: Number(form.protein) || 150,
      carbs: Number(form.carbs) || 200,
      fats: Number(form.fats) || 65,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Macro Targets</h2>
        <div className="space-y-3">
          {(['calories', 'protein', 'carbs', 'fats'] as const).map(key => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block capitalize">
                {key}{key !== 'calories' ? ' (g)' : ' (kcal)'}
              </label>
              <input
                type="number"
                min="0"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Save</button>
        </div>
      </div>
    </div>
  )
}
