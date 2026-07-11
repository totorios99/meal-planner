'use client'
import Link from 'next/link'
import { Meal } from '@/types'
import { Icon } from '@/components/Icon'
import { MacroRow } from '@/components/meals/MacroRow'
import { FavoriteButton } from '@/components/meals/FavoriteButton'

interface Props {
  meal: Meal
  onEdit: (meal: Meal) => void
  onDelete: (id: number) => void
  onFavToggled?: () => void
}

export function MealCard({ meal, onEdit, onDelete, onFavToggled }: Props) {
  function handleEdit(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onEdit(meal)
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${meal.title}"?`)) return
    onDelete(meal.id)
  }

  return (
    <Link href={`/meals/${meal.id}`} className="meal-card meal-card-link">
      <div className="meal-card-img">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.title} />
        ) : (
          <div className="photo-ph">{meal.title[0]}</div>
        )}
        {meal.tag && (
          <div className="meal-tags">
            {meal.tag.split(',').map(t => t.trim()).filter(Boolean).map(t => (
              <span key={t} className="meal-tag">{t}</span>
            ))}
          </div>
        )}
        <div className="meal-card-img-overlay">
          <button className="icon-btn" title="Edit" onClick={handleEdit}>
            <Icon name="edit" size={15} />
          </button>
          <button className="icon-btn" title="Delete" onClick={handleDelete}>
            <Icon name="trash" size={15} />
          </button>
        </div>
        <div className={`meal-fav${meal.isFavorite ? ' has-fav' : ''}`}>
          <FavoriteButton mealId={meal.id} isFavorite={meal.isFavorite} onToggled={onFavToggled} />
        </div>
      </div>

      <div className="meal-card-body">
        <h3 className="meal-name">{meal.title}</h3>
        {meal.description && <p className="meal-desc">{meal.description}</p>}

        <MacroRow calories={meal.calories} protein={meal.protein} carbs={meal.carbs} fats={meal.fats} />
      </div>
    </Link>
  )
}
