'use client'
import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Toast } from '@/components/ui/Toast'
import { Tooltip } from '@/components/ui/Tooltip'
import { motionMs } from '@/lib/useExitTransition'

interface Props {
  mealId: number
  isFavorite: boolean
  onToggled?: () => void
}

const PARTICLES = 8

export function FavoriteButton({ mealId, isFavorite, onToggled }: Props) {
  const [fav, setFav] = useState(isFavorite)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Each like sprays its own vectors, so two favourites in a row don't replay the
  // identical burst. Written as custom properties the keyframe reads.
  function burst() {
    const el = btnRef.current
    if (!el) return
    const dist = motionMs('--like-particle-dist', 20)
    el.querySelectorAll<HTMLElement>('.t-like-particles i').forEach((dot, i) => {
      const angle = (i / PARTICLES) * Math.PI * 2 + Math.random() * 0.5
      const reach = dist * (0.7 + Math.random() * 0.6)
      dot.style.setProperty('--px', `${Math.cos(angle) * reach}px`)
      dot.style.setProperty('--py', `${Math.sin(angle) * reach}px`)
      dot.style.setProperty('--pdur', `${420 + Math.random() * 260}ms`)
      dot.style.setProperty('--pdelay', `${Math.random() * 60}ms`)
      dot.style.setProperty('--psize', `${0.7 + Math.random() * 0.8}`)
      dot.style.setProperty('--p-end-scale', `${0.3 + Math.random() * 0.4}`)
    })
    el.classList.remove('is-bursting')
    void el.offsetWidth   // reflow, or a second like in the same second replays nothing
    el.classList.add('is-bursting')
    if (burstTimer.current) clearTimeout(burstTimer.current)
    burstTimer.current = setTimeout(
      () => el.classList.remove('is-bursting'),
      motionMs('--like-particle-dur', 600) + 200,
    )
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    setError(null)
    // try/finally, not a bare await: a dropped connection rejects here, and without it
    // setBusy(false) never ran — the button stayed disabled until a page reload.
    let res: Response
    try {
      res = await fetch(`/api/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !fav }),
      })
    } catch {
      setBusy(false)
      setError('Network error — favourite not updated.')
      return
    }
    setBusy(false)
    if (res.ok) {
      setFav(!fav)
      if (!fav) burst()   // celebrate the like, not the un-like
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
      <Tooltip label={fav ? 'Remove from favorites' : 'Add to favorites (max 5)'}>
        <button
          ref={btnRef}
          className={`fav-btn t-like${fav ? ' is-fav' : ''}`}
          data-liked={fav}
          onClick={toggle}
          disabled={busy}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={fav}
        >
          {/* The pop scales this wrapper, never the <svg> — Chromium rasterises a
              transformed inline SVG at 1x and the heart goes soft on hi-DPI. */}
          <span className="t-like-icon">
            <Icon name="heart" size={16} className="t-like-heart" />
          </span>
          <span className="t-like-particles" aria-hidden>
            {Array.from({ length: PARTICLES }, (_, i) => <i key={i} />)}
          </span>
        </button>
      </Tooltip>
      <Toast open={!!error} onDismiss={() => setError(null)} message={error} role="alert" />
    </>
  )
}
