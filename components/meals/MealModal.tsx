'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Meal } from '@/types'
import { Icon } from '@/components/Icon'

interface Props {
  meal?: Meal | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  title: '',
  description: '',
  tag: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  imageUrl: '',
}

export function MealModal({ meal, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (meal) {
      setForm({
        title: meal.title,
        description: meal.description,
        tag: meal.tag,
        calories: String(meal.calories),
        protein: String(meal.protein),
        carbs: String(meal.carbs),
        fats: String(meal.fats),
        imageUrl: meal.imageUrl,
      })
    } else {
      setForm(EMPTY)
    }
  }, [meal])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const method = meal ? 'PUT' : 'POST'
    const url = meal ? `/api/meals/${meal.id}` : '/api/meals'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return createPortal(
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-head">
          <h2 className="sheet-title">{meal ? 'Edit meal' : 'New meal'}</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sheet-body">
            <div className="field">
              <label htmlFor="title">Name</label>
              <input
                id="title"
                required
                placeholder="e.g. Chicken Rice Bowl"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="One-line description"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                style={{ resize: 'none', height: 72 }}
              />
            </div>

            <div className="field">
              <label htmlFor="tag">Tag</label>
              <input
                id="tag"
                placeholder="e.g. Breakfast, Dinner, High protein"
                value={form.tag}
                onChange={e => set('tag', e.target.value)}
              />
            </div>

            <div className="field-grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="calories">Calories</label>
                <input
                  id="calories"
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.calories}
                  onChange={e => set('calories', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="protein">Protein (g)</label>
                <input
                  id="protein"
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.protein}
                  onChange={e => set('protein', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="carbs">Carbs (g)</label>
                <input
                  id="carbs"
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.carbs}
                  onChange={e => set('carbs', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="fats">Fats (g)</label>
                <input
                  id="fats"
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.fats}
                  onChange={e => set('fats', e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="imageUrl">Photo URL</label>
              <input
                id="imageUrl"
                placeholder="https://…"
                value={form.imageUrl}
                onChange={e => set('imageUrl', e.target.value)}
              />
            </div>
          </div>

          <div className="sheet-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : meal ? 'Save changes' : 'Add meal'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
