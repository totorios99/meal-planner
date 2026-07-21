'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Meal } from '@/types'
import { Icon } from '@/components/Icon'
import { parseList, parseIngredients, sumIngredients, type Ingredient } from '@/lib/recipe'
import { PhotoInput } from '@/components/meals/PhotoInput'
import { IngredientEditor } from '@/components/meals/IngredientEditor'

interface Props {
  meal?: Meal | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  title: '',
  description: '',
  tag: '',
  imageUrl: '',
  steps: '',
  prepMinutes: '',
  cookMinutes: '',
  servings: '',
}

function toLines(v: string) {
  return v.split('\n').map(s => s.trim()).filter(Boolean)
}

export function MealModal({ meal, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY)
  // Seed synchronously: IngredientEditor reads its value once on mount, before effects run.
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => meal ? parseIngredients(meal.ingredients) : [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (meal) {
      setForm({
        title: meal.title,
        description: meal.description,
        tag: meal.tag,
        imageUrl: meal.imageUrl,
        steps: parseList(meal.steps).join('\n'),
        prepMinutes: meal.prepMinutes ? String(meal.prepMinutes) : '',
        cookMinutes: meal.cookMinutes ? String(meal.cookMinutes) : '',
        servings: String(meal.servings),
      })
      setIngredients(parseIngredients(meal.ingredients))
    } else {
      setForm(EMPTY)
      setIngredients([])
    }
  }, [meal])

  const macros = sumIngredients(ingredients)

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
      body: JSON.stringify({
        ...form,
        ingredients,
        steps: toLines(form.steps),
        prepMinutes: form.prepMinutes || 0,
        cookMinutes: form.cookMinutes || 0,
        servings: form.servings || 1,
      }),
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
              <label htmlFor="tag">Tags <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— comma separated</span></label>
              <input
                id="tag"
                placeholder="e.g. Breakfast, High protein, Meal prep"
                value={form.tag}
                onChange={e => set('tag', e.target.value)}
              />
              {form.tag && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {form.tag.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 999, background: 'var(--bg-sunken)', color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.02em' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <label>Macros <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— summed from ingredients</span></label>
              <div className="macro-readout">
                <div><span>{Math.round(macros.calories)}</span><label>kcal</label></div>
                <div><span>{Math.round(macros.protein)}</span><label>protein</label></div>
                <div><span>{Math.round(macros.carbs)}</span><label>carbs</label></div>
                <div><span>{Math.round(macros.fats)}</span><label>fats</label></div>
              </div>
            </div>

            <div className="field-grid-2" style={{ marginTop: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="prepMinutes">Prep (min)</label>
                <input
                  id="prepMinutes"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.prepMinutes}
                  onChange={e => set('prepMinutes', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="cookMinutes">Cook (min)</label>
                <input
                  id="cookMinutes"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.cookMinutes}
                  onChange={e => set('cookMinutes', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="servings">Servings</label>
                <input
                  id="servings"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={form.servings}
                  onChange={e => set('servings', e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>Ingredients <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— macros per row; totals above update live</span></label>
              <IngredientEditor key={meal?.id ?? 'new'} value={ingredients} onChange={setIngredients} />
            </div>

            <div className="field">
              <label htmlFor="steps">Steps <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— one per line</span></label>
              <textarea
                id="steps"
                placeholder={'Season the chicken\nCook rice\nGrill 6 min per side'}
                value={form.steps}
                onChange={e => set('steps', e.target.value)}
                style={{ resize: 'vertical', height: 96 }}
              />
            </div>

            <PhotoInput value={form.imageUrl} onChange={url => set('imageUrl', url)} />
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
