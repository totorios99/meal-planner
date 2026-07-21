'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FoodRow } from '@/types'
import { FoodModal } from '@/components/foods/FoodModal'
import { Icon } from '@/components/Icon'

export default function FoodsPage() {
  const [foods, setFoods] = useState<FoodRow[] | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<FoodRow | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchFoods = useCallback(async () => {
    const res = await fetch('/api/foods')
    setFoods(await res.json())
  }, [])

  useEffect(() => { fetchFoods() }, [fetchFoods])

  const filtered = useMemo(() => {
    if (!foods) return []
    if (!q) return foods
    const needle = q.toLowerCase()
    return foods.filter(f => f.name.toLowerCase().includes(needle))
  }, [foods, q])

  function openCreate() { setEditing(null); setShowModal(true) }
  function openEdit(f: FoodRow) { setEditing(f); setShowModal(true) }

  async function handleDelete(f: FoodRow) {
    if (!confirm(`Delete "${f.name}"?`)) return
    const res = await fetch(`/api/foods/${f.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const b = await res.json().catch(() => null)
      alert(b?.error ?? 'Could not delete food')
      return
    }
    fetchFoods()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">
            {foods === null ? 'Foods' : `Foods · ${foods.length}`}
          </div>
          <h1 className="page-title">Your <em>food</em> library.</h1>
          <p className="page-sub">Macros live here — meals and plans pull from these. Fix a food once and every meal updates.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={14} /> New food
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} className="search-icon" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search foods…" />
        </div>
      </div>

      {foods === null ? (
        <div className="empty"><div className="empty-title">Loading…</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-title">{q ? 'No foods match.' : 'No foods yet.'}</div>
          {!q && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openCreate}>
              <Icon name="plus" size={14} /> New food
            </button>
          )}
        </div>
      ) : (
        <div className="food-list">
          {filtered.map(f => (
            <button key={f.id} className="food-row" onClick={() => openEdit(f)}>
              <div className="food-row-main">
                <span className="food-row-name">{f.name}</span>
                <span className="food-row-macros">
                  {Math.round(f.calories * 100) / 100} kcal · {Math.round(f.protein * 100) / 100}P {Math.round(f.carbs * 100) / 100}C {Math.round(f.fats * 100) / 100}F
                  <span className="food-row-per"> / {f.baseUnit || 'unit'}</span>
                </span>
              </div>
              {f.measures.length > 0 && (
                <span className="food-row-measures">{f.measures.map(m => m.unit).join(', ')}</span>
              )}
              <span className="food-row-del" role="button" title="Delete"
                onClick={e => { e.stopPropagation(); handleDelete(f) }}>
                <Icon name="trash" size={14} />
              </span>
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <FoodModal food={editing} onClose={() => setShowModal(false)} onSaved={fetchFoods} />
      )}
    </div>
  )
}
