'use client'
import { useState, useEffect, useCallback } from 'react'
import { Meal } from '@/types'
import { MealGrid } from '@/components/meals/MealGrid'
import { MealModal } from '@/components/meals/MealModal'

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const fetchMeals = useCallback(async () => {
    const res = await fetch('/api/meals')
    const data = await res.json()
    setMeals(data)
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meal Cookbook</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          + New Meal
        </button>
      </div>
      <MealGrid meals={meals} onRefresh={fetchMeals} />
      {showCreate && (
        <MealModal
          meal={null}
          onClose={() => setShowCreate(false)}
          onSaved={fetchMeals}
        />
      )}
    </div>
  )
}
