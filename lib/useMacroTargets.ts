'use client'
import { useState, useEffect } from 'react'

export type MacroTargets = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

const DEFAULTS: MacroTargets = {
  // Slight surplus for muscle gain: 2440 kcal (160/270/80 = 640+1080+720)
  calories: 2450,
  protein: 160,
  carbs: 270,
  fats: 80,
}

const STORAGE_KEY = 'meal-planner-macro-targets'

export function useMacroTargets() {
  const [targets, setTargets] = useState<MacroTargets>(DEFAULTS)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      // Validate the shape, don't just parse it: a value written before a key was renamed
      // leaves that macro undefined, and every DayAnalytics bar then renders NaN% with no
      // way back short of clearing site data. Fall back per-key instead.
      const raw = JSON.parse(stored) as Partial<Record<keyof MacroTargets, unknown>>
      const next = { ...DEFAULTS }
      for (const k of Object.keys(DEFAULTS) as (keyof MacroTargets)[]) {
        if (typeof raw?.[k] === 'number' && Number.isFinite(raw[k])) next[k] = raw[k] as number
      }
      setTargets(next)
    } catch {}
  }, [])

  function updateTargets(next: MacroTargets) {
    setTargets(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { targets, updateTargets }
}
