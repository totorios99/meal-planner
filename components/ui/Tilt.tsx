'use client'
import { useRef } from 'react'

interface Props {
  /** Maximum rotation in degrees at the far edge. */
  max?: number
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * Tilts its child toward the pointer, with a light glare tracking the cursor.
 *
 * The pointer is tracked on this OUTER wrapper, which never transforms — bind
 * it to the rotating card instead and its edges slip under the cursor, so the
 * hover flickers on and off along the border.
 */
export function Tilt({ max = 6, className, style, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  function move(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--tilt-ry', `${((px - 0.5) * 2 * max).toFixed(2)}deg`)
    el.style.setProperty('--tilt-rx', `${(-(py - 0.5) * 2 * max).toFixed(2)}deg`)
    el.style.setProperty('--tilt-gx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--tilt-gy', `${(py * 100).toFixed(1)}%`)
    // `.is-hover` fades the glare in on the wrapper; `.is-tilting` swaps the
    // card to the short follow clock, and belongs on the card that rotates.
    el.classList.add('is-hover')
    el.querySelector('.t-tilt-card')?.classList.add('is-tilting')
  }

  function leave() {
    const el = ref.current
    if (!el) return
    // Drop `is-tilting` first so the return home uses the long ease, not the
    // short follow the pointer was being tracked with.
    el.querySelector('.t-tilt-card')?.classList.remove('is-tilting')
    el.classList.remove('is-hover')
    el.style.setProperty('--tilt-rx', '0deg')
    el.style.setProperty('--tilt-ry', '0deg')
  }

  return (
    <div
      ref={ref}
      className={`t-tilt${className ? ' ' + className : ''}`}
      style={style}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      {children}
    </div>
  )
}
