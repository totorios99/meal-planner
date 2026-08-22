'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSheetTransition } from '@/lib/useExitTransition'
import { Tooltip } from '@/components/ui/Tooltip'
import { Meal } from '@/types'
import { Icon } from '@/components/Icon'
import { parseList, parseRefs, parseStages, parseStageLines, stageLines, sumRefs, foodsMap, type IngredientRef } from '@/lib/recipe'
import { PhotoInput } from '@/components/meals/PhotoInput'
import { FoodPicker } from '@/components/meals/FoodPicker'
import type { FoodRow } from '@/types'

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
  stages: '',
  prepMinutes: '',
  cookMinutes: '',
  servings: '',
}

function toLines(v: string) {
  return v.split('\n').map(s => s.trim()).filter(Boolean)
}

// Seeded once, from the meal the modal opened on. Callers pass a `key` derived from the meal
// id, so switching which meal is being edited remounts this component rather than syncing prop
// into state through an effect — the effect version rendered every open twice, once empty and
// once filled (react.dev/learn/you-might-not-need-an-effect).
function seedForm(meal: Meal | null | undefined) {
  if (!meal) return EMPTY
  return {
    title: meal.title,
    description: meal.description,
    tag: meal.tag,
    imageUrl: meal.imageUrl,
    steps: parseList(meal.steps).join('\n'),
    stages: stageLines(parseStages(meal.stages)),
    prepMinutes: meal.prepMinutes ? String(meal.prepMinutes) : '',
    cookMinutes: meal.cookMinutes ? String(meal.cookMinutes) : '',
    servings: String(meal.servings),
  }
}

export function MealModal({ meal, onClose, onSaved }: Props) {
  const [sheetState, close] = useSheetTransition(onClose)
  const [form, setForm] = useState(() => seedForm(meal))
  // Seed synchronously: FoodPicker reads its value once on mount, before effects run.
  const [ingredients, setIngredients] = useState<IngredientRef[]>(() => meal ? parseRefs(meal.ingredients) : [])
  const [foods, setFoods] = useState<FoodRow[]>([])
  const [foodsLoaded, setFoodsLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ingredientsValid, setIngredientsValid] = useState(true)

  useEffect(() => {
    fetch('/api/foods').then(r => r.json()).then(setFoods).catch(() => {}).finally(() => setFoodsLoaded(true))
  }, [])

  const macros = sumRefs(ingredients, foodsMap(foods))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ingredientsValid) return
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
        stages: parseStageLines(form.stages),
        prepMinutes: form.prepMinutes || 0,
        cookMinutes: form.cookMinutes || 0,
        servings: form.servings || 1,
      }),
    })
    setSaving(false)
    onSaved()
    close()
  }

  return createPortal(
    <div className={`sheet-backdrop ${sheetState}`} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className={`sheet t-modal ${sheetState}`}>
        <div className="sheet-head">
          <h2 className="sheet-title">{meal ? 'Edit meal' : 'New meal'}</h2>
          <Tooltip label="Close">
            <button className="icon-btn" onClick={close} aria-label="Close">
              <Icon name="x" size={16} />
            </button>
          </Tooltip>
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
              <label>Macros <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— summed from foods</span></label>
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
              <label>Ingredients <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— pick foods; macros come from the Foods library</span></label>
              <FoodPicker key={`${meal?.id ?? 'new'}-${foodsLoaded}`} value={ingredients} foods={foods} onChange={setIngredients} onValidChange={setIngredientsValid} />
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

            <div className="field">
              <label htmlFor="stages">
                Cook stages <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— one per line: label | timing | 330s | slot 0 | ing 0-1 | &gt; full instruction</span>
              </label>
              <textarea
                id="stages"
                placeholder={'Soften the onion | 5–6 min | 330s | slot 0 | ing 0-1 | > Cook the diced onion in the oil until translucent.\nToast the spices | 2 min | 120s | slot 1 | ing 2-5 | > Add the spices and stir until fragrant.\nWarm the pita | | 0s | slot 1 | ing 6 | meanwhile | > Warm over the flame until it puffs.'}
                value={form.stages}
                onChange={e => set('stages', e.target.value)}
                style={{ resize: 'vertical', height: 96, fontFamily: 'var(--mono)', fontSize: 12 }}
              />
              <p className="field-hint">
                Powers the cook-mode chart. Keep the label to a few words — the text after <code>&gt;</code> is the
                full instruction, shown when you hover a stage or reach it while cooking. <code>ing</code> indices
                count the ingredient rows above from 0; same <code>slot</code> = runs at the same time;
                <code>meanwhile</code> marks the unattended one. Leave empty to fall back to the plain step list.
              </p>
            </div>

            <PhotoInput value={form.imageUrl} onChange={url => set('imageUrl', url)} />
          </div>

          <div className="sheet-foot">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !ingredientsValid}
              title={!ingredientsValid ? 'Fix the highlighted ingredient row first' : undefined}>
              {saving ? 'Saving…' : meal ? 'Save changes' : 'Add meal'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
