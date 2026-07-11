'use client'
import { useState } from 'react'
import { Icon } from '@/components/Icon'

interface Props {
  mealId: number
  isFavorite: boolean
  onToggled?: () => void
}

export function FavoriteButton({ mealId, isFavorite, onToggled }: Props) {
  const [fav, setFav] = useState(isFavorite)
  const [busy, setBusy] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const res = await fetch(`/api/meals/${mealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: !fav }),
    })
    setBusy(false)
    if (res.ok) {
      setFav(!fav)
      onToggled?.()
    } else {
      const body = await res.json().catch(() => null)
      alert(body?.error ?? 'Could not update favorite')
    }
  }

  return (
    <button
      className={`fav-btn${fav ? ' is-fav' : ''}`}
      onClick={toggle}
      title={fav ? 'Remove from favorites' : 'Add to favorites (max 5)'}
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={fav}
    >
      <Icon name={fav ? 'heart-fill' : 'heart'} size={16} />
    </button>
  )
}
