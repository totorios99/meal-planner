'use client'
import { useEffect, useId, useRef } from 'react'

const num = (name: string, fb: number) => {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(v) ? v : fb
}

/**
 * A number that rolls to its new value like a slot machine, one reel per digit.
 *
 * The streak is an SVG `feGaussianBlur` with a vertical-only deviation — CSS
 * `blur()` is isotropic and would smear the digits sideways into mush. Each
 * column decays its own blur to zero as that reel lands.
 */
export function SpinningCounter({ value, className }: { value: number; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const text = Math.round(value).toLocaleString()
  const chars = text.split('')
  const stripRefs = useRef<(HTMLDivElement | null)[]>([])
  const blurRefs = useRef<(SVGFEGaussianBlurElement | null)[]>([])
  const rafRef = useRef(0)
  const previous = useRef<string | null>(null)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  useEffect(() => {
    const first = previous.current === null
    previous.current = text
    const cell = num('--reel-cell', 30)
    const dur = num('--reel-dur', 1400)
    const stagger = num('--reel-stagger', 90)
    const maxBlur = num('--reel-spin-blur', 3)
    const ease = getComputedStyle(document.documentElement).getPropertyValue('--reel-ease').trim()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let col = 0
    chars.forEach((ch, i) => {
      if (!/\d/.test(ch)) return
      const strip = stripRefs.current[i]
      if (!strip) return
      const digit = Number(ch)
      // Land on the digit in the LAST bank of ten, so the reel spins through a
      // few full turns on the way rather than sliding straight to the answer.
      const spins = first || reduced ? 0 : 3
      const delay = first || reduced ? 0 : col * stagger
      strip.style.transition = first || reduced
        ? 'none'
        : `transform ${dur}ms ${ease || 'cubic-bezier(0.16, 1, 0.3, 1)'} ${delay}ms`
      strip.style.transform = `translateY(-${(spins * 10 + digit) * cell}px)`
      col++
    })

    if (first || reduced) return

    // Decay each column's streak over its own window: full deviation while the
    // reel is travelling, nothing once it has settled.
    const columns = chars.map((ch, i) => ({ i, isDigit: /\d/.test(ch) })).filter(c => c.isDigit)
    const t0 = performance.now()
    const tick = (now: number) => {
      const el = now - t0
      let running = false
      columns.forEach((c, ci) => {
        const b = blurRefs.current[c.i]
        if (!b) return
        const start = ci * stagger
        const p = Math.min(1, Math.max(0, (el - start) / dur))
        // Peak early, fade out as it lands — a reel is fastest just after launch.
        const amount = p <= 0 || p >= 1 ? 0 : maxBlur * Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 2
        b.setAttribute('stdDeviation', `0 ${amount.toFixed(2)}`)
        if (p < 1) running = true
      })
      if (running) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [text])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={`t-reel${className ? ' ' + className : ''}`}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {chars.map((ch, i) => /\d/.test(ch) && (
            <filter key={i} id={`${uid}-${i}`}>
              <feGaussianBlur ref={el => { blurRefs.current[i] = el }} stdDeviation="0 0" />
            </filter>
          ))}
        </defs>
      </svg>
      {/* The accessible value is the plain number; the reels are decoration. */}
      <span className="t-reel-sr">{text}</span>
      {chars.map((ch, i) => !/\d/.test(ch) ? (
        <span key={i} className="t-reel-sep" aria-hidden>{ch}</span>
      ) : (
        <span key={i} className="t-reel-col" aria-hidden>
          <span
            className="t-reel-strip"
            ref={el => { stripRefs.current[i] = el as unknown as HTMLDivElement }}
            style={{ filter: `url(#${uid}-${i})` }}
          >
            {Array.from({ length: 40 }, (_, d) => (
              <span key={d} className="t-reel-digit">{d % 10}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}
