'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Meal } from '@/types'
import { MealGrid } from '@/components/meals/MealGrid'
import { MealModal } from '@/components/meals/MealModal'
import { Icon } from '@/components/Icon'

export default function CookbookPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [q, setQ] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchMeals = useCallback(async () => {
    const res = await fetch('/api/meals')
    const data = await res.json()
    setMeals(data)
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  const tags = useMemo(() => {
    const s = new Set<string>()
    meals.forEach(m => {
      if (m.tag) m.tag.split(',').map(t => t.trim()).filter(Boolean).forEach(t => s.add(t))
    })
    return ['All', ...Array.from(s).sort()]
  }, [meals])

  const filtered = useMemo(() => {
    return meals.filter(m => {
      if (activeTag !== 'All') {
        const mealTags = m.tag ? m.tag.split(',').map(t => t.trim()).filter(Boolean) : []
        if (!mealTags.includes(activeTag)) return false
      }
      if (q) {
        const hay = `${m.title} ${m.description} ${m.tag}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [meals, activeTag, q])

  function openCreate() {
    setEditingMeal(null)
    setShowModal(true)
  }

  function openEdit(meal: Meal) {
    setEditingMeal(meal)
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    fetchMeals()
  }

  function closeModal() {
    setShowModal(false)
    setEditingMeal(null)
  }

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Cookbook · {meals.length} meal{meals.length !== 1 ? 's' : ''}</div>
          <h1 className="page-title">Your <em>recipes,</em> with macros.</h1>
          <p className="page-sub">Tap any card to edit. New ideas slot straight into next week&apos;s plan.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost">
            <Icon name="sparkle" size={14} /> Generate ideas
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={14} /> New meal
          </button>
        </div>
      </div>

      {/* Search + filter toolbar */}
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} className="search-icon" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search meals, ingredients, tags…"
          />
        </div>
        <div className="chips">
          {tags.map(t => (
            <button
              key={t}
              className={`chip ${activeTag === t ? 'active' : ''}`}
              onClick={() => setActiveTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {meals.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No meals yet.</div>
          <p style={{ fontSize: 14, marginTop: 6 }}>Add your first recipe to get started.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openCreate}>
            <Icon name="plus" size={14} /> New meal
          </button>
        </div>
      ) : (
        <MealGrid meals={filtered} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {/* Modal */}
      {showModal && (
        <MealModal
          meal={editingMeal}
          onClose={closeModal}
          onSaved={fetchMeals}
        />
      )}
    </div>
  )
}
