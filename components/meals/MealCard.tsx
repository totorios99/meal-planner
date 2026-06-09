'use client'
import { Meal } from '@/types'
import { Icon } from '@/components/Icon'

interface Props {
  meal: Meal
  onEdit: (meal: Meal) => void
  onDelete: (id: number) => void
}

export function MealCard({ meal, onEdit, onDelete }: Props) {
  function handleDelete() {
    if (!confirm(`Delete "${meal.title}"?`)) return
    onDelete(meal.id)
  }

  return (
    <div className="meal-card">
      <div className="meal-card-img">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.title} />
        ) : (
          <div className="photo-ph">{meal.title[0]}</div>
        )}
        {meal.tag && <span className="meal-tag">{meal.tag}</span>}
        <div className="meal-card-img-overlay">
          <button className="icon-btn" title="Edit" onClick={() => onEdit(meal)}>
            <Icon name="edit" size={15} />
          </button>
          <button className="icon-btn" title="Delete" onClick={handleDelete}>
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      <div className="meal-card-body">
        <h3 className="meal-name">{meal.title}</h3>
        {meal.description && <p className="meal-desc">{meal.description}</p>}

        <div className="macro-row">
          <div className="macro-chip">
            <span className="macro-chip-label">kcal</span>
            <span className="macro-chip-value num">{Math.round(meal.calories)}</span>
          </div>
          <div className="macro-chip">
            <span className="macro-chip-label">
              <span className="macro-dot" style={{ background: 'var(--protein)', marginRight: 4 }} />
              Protein
            </span>
            <span className="macro-chip-value num">
              {Math.round(meal.protein)}<span style={{ color: 'var(--ink-4)', fontSize: 11, marginLeft: 1 }}>g</span>
            </span>
          </div>
          <div className="macro-chip">
            <span className="macro-chip-label">
              <span className="macro-dot" style={{ background: 'var(--carbs)', marginRight: 4 }} />
              Carbs
            </span>
            <span className="macro-chip-value num">
              {Math.round(meal.carbs)}<span style={{ color: 'var(--ink-4)', fontSize: 11, marginLeft: 1 }}>g</span>
            </span>
          </div>
          <div className="macro-chip">
            <span className="macro-chip-label">
              <span className="macro-dot" style={{ background: 'var(--fats)', marginRight: 4 }} />
              Fats
            </span>
            <span className="macro-chip-value num">
              {Math.round(meal.fats)}<span style={{ color: 'var(--ink-4)', fontSize: 11, marginLeft: 1 }}>g</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
