'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  autoFocus?: boolean
  className?: string
}

const num = (name: string, fb: number) => {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(v) ? v : fb
}

/** Minimal cubic-bezier sampler so the per-frame JS easing matches the CSS tokens. */
function bezier(str: string) {
  const m = String(str).match(/cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/)
  if (!m) return (t: number) => t
  const [x1, y1, x2, y2] = m.slice(1).map(parseFloat)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let s = t
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t
      const d = (3 * ax * s + 2 * bx) * s + cx
      if (Math.abs(dx) < 1e-6 || d === 0) break
      s -= dx / d
    }
    return ((ay * s + by) * s + cy) * s
  }
}

/**
 * The app's search box. Clearing it used to be a cut — the query vanished and
 * the placeholder was simply there — which reads as a glitch on a field the
 * user just spent a sentence filling. Now the words fly out and dissolve while
 * the placeholder rises in behind them, each word leaving its own streak.
 *
 * Typing is untouched; only the × button plays the dissolve.
 */
export function SearchField({ value, onChange, placeholder, label, autoFocus, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const pholdRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  // Held so the words can keep flying after React has already emptied `value`.
  const [clearingText, setClearingText] = useState<string | null>(null)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  /** One radial-gradient layer per word, so each leaves its own streak. */
  const buildGlow = useCallback((text: string) => {
    const input = inputRef.current
    const wrap = wrapRef.current
    if (!input || !wrap) return ''
    const canvas = document.createElement('canvas').getContext('2d')
    if (!canvas) return ''
    const cs = getComputedStyle(input)
    canvas.font = cs.font
    // `:root` is the dark theme here, so anything that isn't explicitly light is
    // dark — and a dark surface needs white gradients to lighten, not darken.
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    const rgb = isDark ? '255,255,255' : '0,0,0'
    const w = wrap.clientWidth || 280
    const padLeft = parseFloat(cs.paddingLeft) || 12
    const spread = num('--glow-spread', 1.5)
    const layers: string[] = []
    let x = 0
    text.split(/(\s+)/).forEach(seg => {
      const segW = canvas.measureText(seg).width
      if (seg.trim()) {
        const cx = padLeft + x + segW / 2
        const hw = Math.max(segW * 0.45, 8) * spread
        ;([[0, 0.8, 7, 0.22], [hw * 0.45, 0.55, 8, 0.18],
           [-hw * 0.4, 0.65, 6, 0.16], [hw * 0.15, 0.9, 5, 0.14]] as const)
          .forEach(([dx, rwm, rh, a]) => {
            const lx = (((cx + dx) / w) * 100).toFixed(2)
            layers.push(
              `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`
            )
          })
      }
      x += segW
    })
    return layers.join(', ')
  }, [])

  function clear() {
    const wrap = wrapRef.current, input = inputRef.current
    const mirror = mirrorRef.current, phold = pholdRef.current, glow = glowRef.current
    if (!wrap || !input || !mirror || !phold || !glow) return
    if (clearingText !== null || !value) return

    const text = value.replace(/ /g, ' ')
    const keepFocus = document.activeElement === input
    setClearingText(text)
    onChange('')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setClearingText(null)
      return
    }

    const root = getComputedStyle(document.documentElement)
    const total = num('--clear-dur', 1000)
    const outDur = num('--clear-out-dur', 400)
    const inDur = num('--clear-in-dur', 400)
    const outFly = num('--clear-out-fly', 12)
    const inFly = num('--clear-in-fly', 12)
    const blur = num('--clear-blur', 2)
    const delay = num('--glow-delay', 50)
    const peakAt = num('--glow-peak-at', 0.15)
    const gOp = num('--glow-opacity', 0.42)
    const easeOut = bezier(root.getPropertyValue('--clear-out-ease'))
    const easeIn = bezier(root.getPropertyValue('--clear-in-ease'))

    glow.style.background = buildGlow(text)
    glow.style.opacity = '0'
    phold.style.transform = `translateY(-${inFly}px)`
    phold.style.opacity = '0.9'
    phold.style.filter = `blur(${blur}px)`

    const t0 = performance.now()
    const tick = (now: number) => {
      const el = now - t0
      const eo = easeOut(Math.min(1, el / outDur))
      mirror.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`
      mirror.style.opacity = (1 - eo).toFixed(3)
      mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`

      const ei = easeIn(Math.min(1, el / inDur))
      phold.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`
      phold.style.opacity = (0.9 + ei * 0.1).toFixed(3)
      phold.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`

      let g = 0
      if (el > delay) {
        const gp = Math.min(1, (el - delay) / Math.max(1, total - delay))
        g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt)
      }
      glow.style.opacity = (g * gOp).toFixed(3)

      if (el < total) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        mirror.style.cssText = ''
        phold.style.cssText = ''
        glow.style.opacity = '0'
        glow.style.background = ''
        setClearingText(null)
        if (keepFocus) requestAnimationFrame(() => input.focus({ preventScroll: true }))
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const hasValue = value.length > 0
  const clearing = clearingText !== null

  return (
    <div
      ref={wrapRef}
      className={`search t-clear${hasValue ? ' has-value' : ''}${clearing ? ' is-clearing' : ''}${className ? ' ' + className : ''}`}
    >
      <Icon name="search" size={16} className="search-icon" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {/* The mirror owns the glyphs while there is a value (the input's own text
          is painted transparent), which is what lets them fly out on their own.
          The placeholder is a real element too, not the input's `placeholder`
          attribute — it has to rise into place behind the words leaving. */}
      <div className="t-clear-mirror" aria-hidden>{clearingText ?? value.replace(/ /g, ' ')}</div>
      <div className="t-clear-placeholder" aria-hidden>{placeholder}</div>
      <div className="t-clear-glow" aria-hidden />
      <button
        type="button"
        className="t-clear-btn"
        aria-label="Clear search"
        // Keep the caret: the default mousedown would blur the field first.
        onMouseDown={e => { if (document.activeElement === inputRef.current) e.preventDefault() }}
        onClick={clear}
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  )
}
