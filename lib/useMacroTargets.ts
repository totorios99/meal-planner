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
