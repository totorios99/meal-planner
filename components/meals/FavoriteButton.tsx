'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'

interface Props {
  mealId: number
  isFavorite: boolean
  onToggled?: () => void
}

export function FavoriteButton({ mealId, isFavorite, onToggled }: Props) {
  const [fav, setFav] = useState(isFavorite)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    setError(null)
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
      // The reachable failure here is the server's max-5-favorites 409, whose message names
      // the recovery. Surfaced through the app's own fixed-alert (same as DayCard's warning)
      // rather than a native alert() — this component also renders inside cookbook cards,
      // where an in-card error box would resize the grid.
      const body = await res.json().catch(() => null)
      setError(typeof body?.error === 'string' ? body.error : 'Could not update favourite. Try again.')
    }
  }

  return (
    <>
      <button
        className={`fav-btn${fav ? ' is-fav' : ''}`}
        onClick={toggle}
        disabled={busy}
        title={fav ? 'Remove from favorites' : 'Add to favorites (max 5)'}
        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={fav}
      >
        <Icon name={fav ? 'heart-fill' : 'heart'} size={16} />
      </button>
      {error && createPortal(
        <div className="fixed-alert" role="alert">
          <Icon name="warning" size={16} />
          <div className="fixed-alert-body"><p>{error}</p></div>
          <button className="icon-btn" onClick={() => setError(null)} title="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
