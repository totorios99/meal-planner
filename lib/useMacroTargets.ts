'use client'
import { useState, useEffect } from 'react'

export type MacroTargets = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

const DEFAULTS: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fats: 65,
}

const STORAGE_KEY = 'meal-planner-macro-targets'

export function useMacroTargets() {
  const [targets, setTargets] = useState<MacroTargets>(DEFAULTS)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setTargets(JSON.parse(stored)) } catch {}
    }
  }, [])

  function updateTargets(next: MacroTargets) {
    setTargets(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { targets, updateTargets }
}
