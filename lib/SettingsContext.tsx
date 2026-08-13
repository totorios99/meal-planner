'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { DEFAULTS, type Settings, type SettingsPatch } from '@/lib/settings'

type Ctx = {
  settings: Settings
  /**
   * Optimistic: state moves now, the PATCH follows, a failure rolls back. Never rejects —
   * most callers fire and forget, so a rejection here would surface as an uncaught error
   * rather than as feedback. Returns whether the save landed; read `error` for the reason.
   */
  update: (patch: SettingsPatch) => Promise<boolean>
  error: string | null
}

const SettingsCtx = createContext<Ctx | null>(null)

// Mirror the preferences the stylesheet and the pre-paint script key off, so a change on
// /settings is visible everywhere immediately instead of on the next server render.
// Units are deliberately absent: cook mode reads them through this context, not off the DOM.
function stamp(s: Settings) {
  const e = document.documentElement
  e.setAttribute('data-recipe-view', s.recipeView)
  e.setAttribute('data-theme-pref', s.theme)
  const dark = s.theme === 'dark' ||
    (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  e.setAttribute('data-theme', dark ? 'dark' : 'light')
  e.classList.toggle('dark', dark)
}

export function SettingsProvider({
  initial,
  children,
}: {
  initial: Settings
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<Settings>(initial)
  const [error, setError] = useState<string | null>(null)
  // The current value, readable outside a render. Lets `update` capture the pre-change state
  // for its rollback without reading it inside a setState updater — updaters must stay pure,
  // and React is free to run one twice or throw its render away.
  const latest = useRef(settings)
  // Set by `update`. The mount re-read below must not undo a save that landed while it was in
  // flight; identity of `initial` can't say that — it's a fresh object every server render.
  const saved = useRef(false)

  const apply = useCallback((next: Settings) => {
    latest.current = next
    setSettings(next)
    stamp(next)
  }, [])

  // `initial` is only as good as the render that produced it. getSettings() degrades to
  // DEFAULTS whenever auth() comes back empty, and a page restored from a home-screen
  // snapshot carries whatever it was serialised with. Either way the whole app then runs on
  // preferences that aren't the user's: a defaulted Monday start made the planner ask for the
  // wrong week and report a Sunday-start plan as missing. Re-read the row once on mount and
  // reconcile — the API resolves the acting user itself, so it is the honest answer.
  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then((row: Settings | null) => {
        // A save that landed first is newer than this read — don't undo it. Signed-out
        // visitors get a 401 (null) and keep the defaults the layout already gave them.
        if (cancelled || !row || saved.current) return
        apply(row)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [apply])

  const update = useCallback(async (patch: SettingsPatch): Promise<boolean> => {
    const previous = latest.current
    saved.current = true
    apply({ ...previous, ...patch })
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`Couldn't save that (${res.status}). Change reverted.`)
      // Trust the row the server actually stored over the optimistic merge.
      apply(await res.json())
      return true
    } catch (err) {
      apply(previous)
      setError(err instanceof Error ? err.message : 'Could not save settings.')
      return false
    }
  }, [apply])

  return (
    <SettingsCtx.Provider value={{ settings, update, error }}>{children}</SettingsCtx.Provider>
  )
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx)
  // Defaults rather than a throw: a client component rendered outside the provider (a portal
  // in a test, a stray island) should still paint sane numbers instead of crashing the page.
  if (!ctx) return { settings: DEFAULTS, update: async () => false, error: null }
  return ctx
}
