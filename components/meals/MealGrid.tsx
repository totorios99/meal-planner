'use client'
import { useState } from 'react'
import { Meal } from '@/types'
import { MealCard } from './MealCard'
import { MealModal } from './MealModal'

interface Props {
  meals: Meal[]
  onRefresh: () => void
}

export function MealGrid({ meals, onRefresh }: Props) {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function handleDelete(id: number) {
    if (!confirm('Delete this meal?')) return
    await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
        {meals.map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            onEdit={m => { setEditingMeal(m); setShowModal(true) }}
            onDelete={handleDelete}
          />
        ))}
        {meals.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-16">No meals yet. Add your first meal!</div>
        )}
      </div>
      {showModal && (
        <MealModal
          meal={editingMeal}
          onClose={() => { setShowModal(false); setEditingMeal(null) }}
          onSaved={onRefresh}
        />
      )}
    </>
  )
}
