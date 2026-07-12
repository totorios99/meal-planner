'use client'
import { useState } from 'react'
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
  style?: React.CSSProperties
}

export function MealCard({ meal, onEdit, onDelete, onFavToggled, style }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  function toggleMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(o => !o)
  }

  function handleEdit(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onEdit(meal)
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    if (!confirm(`Delete "${meal.title}"?`)) return
    onDelete(meal.id)
  }

  const tags = meal.tag.split(',').map(t => t.trim()).filter(Boolean)
  const shownTags = tags.slice(0, 3)

  return (
    <Link
      href={`/meals/${meal.id}`}
      className="meal-card meal-card-link"
      style={style}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <div className="meal-card-img">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.title} />
        ) : (
          <div className="photo-ph">{meal.title[0]}</div>
        )}
        {tags.length > 0 && (
          <div className="meal-tags">
            {shownTags.map(t => (
              <span key={t} className="meal-tag">{t}</span>
            ))}
            {tags.length > shownTags.length && (
              <span className="meal-tag meal-tag-more">+{tags.length - shownTags.length}</span>
            )}
          </div>
        )}
        <div className="meal-menu-wrap">
          <button
            className={`meal-menu-btn${menuOpen ? ' open' : ''}`}
            title="Meal actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <Icon name="dots" size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="meal-menu-backdrop" onClick={toggleMenu} />
              <div className="meal-menu" role="menu">
                <button role="menuitem" onClick={handleEdit}>
                  <Icon name="edit" size={14} /> Edit
                </button>
                <button role="menuitem" className="danger" onClick={handleDelete}>
                  <Icon name="trash" size={14} /> Delete
                </button>
              </div>
            </>
          )}
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
