'use client'
import { useState, useEffect } from 'react'
import { Meal } from '@/types'

interface Props {
  onSelect: (meal: Meal) => void
  onClose: () => void
}

export function MealPicker({ onSelect, onClose }: Props) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/meals').then(r => r.json()).then(setMeals)
  }, [])

  const filtered = meals.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Pick a Meal</h3>
            <button onClick={onClose} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 text-xl leading-none">&times;</button>
          </div>
          <input
            autoFocus
            placeholder="Search meals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(meal => (
            <button
              key={meal.id}
              onClick={() => { onSelect(meal); onClose() }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-50 dark:border-zinc-800"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-zinc-100">{meal.title}</div>
              {meal.description && <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{meal.description}</div>}
              <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 dark:text-zinc-500 py-8 text-sm">No meals found</div>
          )}
        </div>
      </div>
    </div>
  )
}
