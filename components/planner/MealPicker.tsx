'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Meal } from '@/types'
import { Icon } from '@/components/Icon'

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
    `${m.title} ${m.tag}`.toLowerCase().includes(search.toLowerCase())
  )

  return createPortal(
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" style={{ maxWidth: 440 }}>
        <div className="sheet-head">
          <h3 className="sheet-title">Add meal</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '0 16px 10px' }}>
          <div className="search" style={{ maxWidth: '100%' }}>
            <Icon name="search" size={15} className="search-icon" />
            <input
              autoFocus
              type="search"
              aria-label="Search meals"
              placeholder="Search meals…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="sheet-body" style={{ padding: '0 8px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 13 }}>
              No meals found
            </div>
          ) : filtered.map(meal => (
            <button
              key={meal.id}
              className="sheet-meal-row"
              onClick={() => { onSelect(meal); onClose() }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'none' }}
            >
              <div className="sheet-meal-thumb">
                {meal.imageUrl && <img src={meal.imageUrl} alt={meal.title} />}
              </div>
              <div className="sheet-meal-info">
                <div className="sheet-meal-name">{meal.title}</div>
                {/* Whole numbers, matching MacroRow and the recipe page — the 2dp variant this
                    used to render ("796.98 kcal · P 40.34g …") wrapped to a second line on a
                    phone without telling the user anything the rounded figure doesn't. */}
                <div className="sheet-meal-meta">
                  {Math.round(meal.calories)} kcal · P {Math.round(meal.protein)}g · C {Math.round(meal.carbs)}g · F {Math.round(meal.fats)}g
                </div>
              </div>
              <span style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex' }}><Icon name="plus" size={16} /></span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
