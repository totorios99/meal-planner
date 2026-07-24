'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Meal } from '@/types'
import { MealGrid, MealGridSkeleton } from '@/components/meals/MealGrid'
import { MealModal } from '@/components/meals/MealModal'
import { Icon } from '@/components/Icon'

// Module-level cache: back-navigation renders the grid synchronously so the
// browser can restore the scroll position (an empty page has no height to
// scroll to), then the fetch revalidates in the background.
let mealsCache: Meal[] | null = null

// Meal types live in the same tag column (import flattens its categories enum
// into it), but the set is fixed — so they get their own bounded chip row and
// are excluded from the free-form tag chips.
const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']
const TAG_LIMIT = 8

export default function CookbookPage() {
  const [meals, setMeals] = useState<Meal[] | null>(mealsCache)
  const [q, setQ] = useState('')
  const [activeCat, setActiveCat] = useState('All')
  const [activeTag, setActiveTag] = useState('All')
  const [showAllTags, setShowAllTags] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchMeals = useCallback(async () => {
    const res = await fetch('/api/meals')
    const data = await res.json()
    mealsCache = data
    setMeals(data)
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  // Free-form tags ranked by how many meals carry them; categories excluded
  const rankedTags = useMemo(() => {
    const counts = new Map<string, number>()
    ;(meals ?? []).forEach(m => {
      if (m.tag) m.tag.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
        if (!CATEGORIES.includes(t)) counts.set(t, (counts.get(t) ?? 0) + 1)
      })
    })
    return Array.from(counts.keys()).sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) || a.localeCompare(b)
    )
  }, [meals])

  const shownTags = useMemo(() => {
    if (showAllTags || rankedTags.length <= TAG_LIMIT) return rankedTags
    const top = rankedTags.slice(0, TAG_LIMIT)
    // keep the active tag visible even when it ranks below the fold
    if (activeTag !== 'All' && !top.includes(activeTag)) top.push(activeTag)
    return top
  }, [rankedTags, showAllTags, activeTag])

  const filtered = useMemo(() => {
    return (meals ?? []).filter(m => {
      const mealTags = m.tag ? m.tag.split(',').map(t => t.trim()).filter(Boolean) : []
      if (activeCat !== 'All' && !mealTags.includes(activeCat)) return false
      if (activeTag !== 'All' && !mealTags.includes(activeTag)) return false
      if (q) {
        const hay = `${m.title} ${m.description} ${m.tag}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [meals, activeCat, activeTag, q])

  function openCreate() {
    setEditingMeal(null)
    setShowModal(true)
  }

  function openEdit(meal: Meal) {
    setEditingMeal(meal)
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      alert(body?.error ?? 'Could not delete meal')
      return
    }
    fetchMeals()
  }

  function closeModal() {
    setShowModal(false)
    setEditingMeal(null)
  }

  return (
    <main className="page">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">
            {meals === null ? 'Cookbook' : `Cookbook · ${meals.length} meal${meals.length !== 1 ? 's' : ''}`}
          </div>
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
            type="search"
            aria-label="Search meals, ingredients, tags"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search meals, ingredients, tags…"
          />
        </div>
        <div className="chips">
          {['All', ...CATEGORIES].map(c => (
            <button
              key={c}
              className={`chip ${activeCat === c ? 'active' : ''}`}
              onClick={() => setActiveCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {rankedTags.length > 0 && (
          <div className="chips chips-tags">
            {shownTags.map(t => (
              <button
                key={t}
                className={`chip ${activeTag === t ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === t ? 'All' : t)}
              >
                {t}
              </button>
            ))}
            {rankedTags.length > TAG_LIMIT && (
              <button className="chip chip-more" onClick={() => setShowAllTags(v => !v)}>
                {showAllTags ? 'Less' : `+${rankedTags.length - TAG_LIMIT} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {meals === null ? (
        <MealGridSkeleton />
      ) : meals.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No meals yet.</div>
          <p style={{ fontSize: 14, marginTop: 6 }}>Add your first recipe to get started.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openCreate}>
            <Icon name="plus" size={14} /> New meal
          </button>
        </div>
      ) : (
        <MealGrid meals={filtered} onEdit={openEdit} onDelete={handleDelete} onFavToggled={fetchMeals} />
      )}

      {/* Modal */}
      {showModal && (
        <MealModal
          meal={editingMeal}
          onClose={closeModal}
          onSaved={fetchMeals}
        />
      )}
    </main>
  )
}
