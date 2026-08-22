'use client'
import { useEffect, useRef, useState } from 'react'
import { useSettings } from '@/lib/SettingsContext'
import { DEFAULTS, type MacroTargets, type SettingsPatch } from '@/lib/settings'
import { Icon } from '@/components/Icon'
import { Segmented } from '@/components/Segmented'

const MACROS: { key: keyof MacroTargets; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein',  label: 'Protein',  unit: 'g'    },
  { key: 'carbs',    label: 'Carbs',    unit: 'g'    },
  { key: 'fats',     label: 'Fats',     unit: 'g'    },
]

function Row({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <div className="settings-row-title">{title}</div>
        <div className="settings-row-hint">{hint}</div>
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

export function SettingsForm() {
  const { settings, update, error } = useSettings()
  const [saved, setSaved] = useState(false)
  // A target that fell back to the shared default, so the panel can say so instead of silently
  // showing a number the user never typed.
  const [reverted, setReverted] = useState<string | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Which field was reset, and a nonce so resetting the SAME field twice replays
  // the shake instead of doing nothing because the state didn't change.
  const [errKey, setErrKey] = useState<keyof MacroTargets | null>(null)
  const [shake, setShake] = useState(0)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  // Number inputs are edited as text so a half-typed "16" on the way to "160" isn't committed
  // and isn't fought by a re-render. They commit on blur / Enter; everything else on change.
  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (revertTimer.current) clearTimeout(revertTimer.current)
  }, [])

  // The message below the header says what happened; this says *where*. Remove →
  // reflow → re-add is what makes the animation replay on a repeat offence.
  useEffect(() => {
    if (!shake || !errKey) return
    const el = inputs.current[errKey]
    if (!el) return
    el.classList.remove('is-shaking')
    void el.offsetWidth
    el.classList.add('is-shaking')
    const t = setTimeout(() => el.classList.remove('is-shaking'), 400)
    return () => clearTimeout(t)
  }, [shake, errKey])

  // `update` never rejects — it reports failure through the context's `error`, so the only
  // thing to do here is flash "Saved" when it actually landed.
  function commit(patch: SettingsPatch) {
    setSaved(false)
    setReverted(null)
    setErrKey(null)
    void update(patch).then(ok => {
      if (!ok) return
      setSaved(true)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 2000)
    })
  }

  function commitMacro(key: keyof MacroTargets) {
    const raw = draft[key]
    if (raw === undefined) return
    setDraft(d => Object.fromEntries(Object.entries(d).filter(([k]) => k !== key)))
    const n = Number(raw)
    // Blank or nonsense reverts to the shared default rather than writing a target that would
    // make every progress bar in the planner divide by zero. Announced, not silent — otherwise
    // the field just fills itself with a number nobody typed and reports "Saved".
    const ok = n > 0 && Number.isFinite(n)
    commit({ [key]: ok ? n : DEFAULTS[key] } as SettingsPatch)
    if (!ok) {
      const macro = MACROS.find(m => m.key === key)!
      setReverted(`${macro.label} can't be empty — reset to ${DEFAULTS[key].toLocaleString()} ${macro.unit}.`)
      setErrKey(key)
      setShake(n => n + 1)
      if (revertTimer.current) clearTimeout(revertTimer.current)
      revertTimer.current = setTimeout(() => { setReverted(null); setErrKey(null) }, 6000)
    }
  }

  const fromMacros = settings.protein * 4 + settings.carbs * 4 + settings.fats * 9

  return (
    <div className="settings">
      <div className="settings-status" aria-live="polite">
        {error
          ? <span className="settings-error"><Icon name="warning" size={13} /> {error}</span>
          : reverted
          ? <span className="settings-reverted"><Icon name="warning" size={13} /> {reverted}</span>
          : saved && <span className="settings-saved"><Icon name="check" size={13} /> Saved</span>}
      </div>

      <section className="card settings-card">
        <h2 className="settings-card-title">Daily targets</h2>
        <div className="field-grid-2">
          {MACROS.map(m => (
            <div key={m.key} className={`field t-input-wrap${errKey === m.key ? ' is-error' : ''}`}>
              <label htmlFor={`t-${m.key}`}>
                {m.label} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({m.unit})</span>
              </label>
              <input
                id={`t-${m.key}`}
                ref={el => { inputs.current[m.key] = el }}
                className={`t-input${errKey === m.key ? ' is-error' : ''}`}
                type="number"
                min="1"
                inputMode="numeric"
                value={draft[m.key] ?? String(settings[m.key])}
                onChange={e => setDraft(d => ({ ...d, [m.key]: e.target.value }))}
                onBlur={() => commitMacro(m.key)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              />
            </div>
          ))}
        </div>
        <p className="field-hint">
          Protein, carbs and fats add up to <strong>{Math.round(fromMacros).toLocaleString()} kcal</strong>
          {Math.abs(fromMacros - settings.calories) > 50 && (
            <> — {Math.round(fromMacros - settings.calories) > 0 ? 'over' : 'under'} your calorie target
            by {Math.abs(Math.round(fromMacros - settings.calories)).toLocaleString()}.</>
          )}
        </p>
      </section>

      <section className="card settings-card">
        <h2 className="settings-card-title">Cooking</h2>
        <Row title="Default recipe view" hint="Which layout a recipe opens in. You can still switch per recipe.">
          <Segmented
            label="Default recipe view"
            value={settings.recipeView}
            options={[{ value: 'chart', label: 'Cook' }, { value: 'list', label: 'List' }]}
            onPick={v => commit({ recipeView: v })}
          />
        </Row>
        <Row title="Measurement units" hint="How ingredient quantities are shown in cook mode.">
          <Segmented
            label="Measurement units"
            value={settings.units}
            options={[{ value: 'US', label: 'US' }, { value: 'Metric', label: 'Metric' }]}
            onPick={v => commit({ units: v })}
          />
        </Row>
      </section>

      <section className="card settings-card">
        <h2 className="settings-card-title">Appearance</h2>
        <Row title="Theme" hint="System follows your device's light/dark setting.">
          <Segmented
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onPick={v => commit({ theme: v })}
          />
        </Row>
      </section>

      <section className="card settings-card">
        <h2 className="settings-card-title">Planner</h2>
        <Row title="Week starts on" hint="Which day the planner week begins. Existing plans keep their own dates.">
          <Segmented
            label="Week starts on"
            value={settings.weekStartsOn === 0 ? 'sun' : 'mon'}
            options={[{ value: 'mon', label: 'Monday' }, { value: 'sun', label: 'Sunday' }]}
            onPick={v => commit({ weekStartsOn: v === 'sun' ? 0 : 1 })}
          />
        </Row>
        <Row title="Full meal titles" hint="Show long meal names in full instead of truncating them.">
          <Segmented
            label="Full meal titles"
            value={settings.plannerFullTitles ? 'on' : 'off'}
            options={[{ value: 'off', label: 'Truncate' }, { value: 'on', label: 'Full' }]}
            onPick={v => commit({ plannerFullTitles: v === 'on' })}
          />
        </Row>
      </section>
    </div>
  )
}
