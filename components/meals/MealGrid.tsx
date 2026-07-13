'use client'
import { Meal } from '@/types'
import { MealCard } from './MealCard'

interface Props {
  meals: Meal[]
  onEdit: (meal: Meal) => void
  onDelete: (id: number) => void
  onFavToggled?: () => void
}

export function MealGridSkeleton() {
  return (
    <div className="meal-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="meal-card meal-skeleton" style={{ '--i': i } as React.CSSProperties}>
          <div className="meal-skeleton-img shimmer" />
          <div className="meal-skeleton-body">
            <div className="shimmer meal-skeleton-bar" />
            <div className="shimmer meal-skeleton-bar short" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MealGrid({ meals, onEdit, onDelete, onFavToggled }: Props) {
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
      {meals.map((meal, i) => (
        <MealCard
          key={meal.id}
          meal={meal}
          onEdit={onEdit}
          onDelete={onDelete}
          onFavToggled={onFavToggled}
          style={{ '--i': Math.min(i, 10) } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
