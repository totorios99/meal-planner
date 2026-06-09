'use client'
import { Meal } from '@/types'
import { MealCard } from './MealCard'

interface Props {
  meals: Meal[]
  onEdit: (meal: Meal) => void
  onDelete: (id: number) => void
}

export function MealGrid({ meals, onEdit, onDelete }: Props) {
  if (meals.length === 0) {
    return (
      <div className="empty">
        <div className="empty-title">No meals match that.</div>
        <p style={{ fontSize: 14 }}>Try clearing the filter or search.</p>
      </div>
    )
  }

  return (
    <div className="meal-grid">
      {meals.map(meal => (
        <MealCard
          key={meal.id}
          meal={meal}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
