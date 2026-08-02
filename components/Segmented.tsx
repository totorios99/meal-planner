'use client'
import { useRef } from 'react'

export type SegmentedOption<T> = { value: T; label: string; ariaLabel?: string }

// The `.cook-seg-pills` primitive from DESIGN.md, with the keyboard behaviour its own ARIA
// promises. `role="radiogroup"` means one tab stop and arrows to move within it (ARIA APG); the
// hand-rolled copies of this markup shipped N tab stops and dead arrow keys instead. One
// component now, used by /settings and CookMode's Serves row.
export function Segmented<T extends string | number>({
  label, value, options, onPick,
}: {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onPick: (v: T) => void
}) {
  const group = useRef<HTMLDivElement>(null)
  // Roving tabindex needs a focusable member even if `value` matches nothing (a stale saved
  // preference, a servings count outside the offered steps) — fall back to the first.
  const current = Math.max(0, options.findIndex(o => o.value === value))

  function move(to: number) {
    const next = (to + options.length) % options.length
    onPick(options[next].value)
    // The buttons are stable by index, so the node is already there — no wait for the re-render.
    group.current?.querySelectorAll('button')[next]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(current + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(current - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(options.length - 1)
    else return
    e.preventDefault()
  }

  return (
    <div
      ref={group}
      className="cook-seg-pills"
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.ariaLabel}
          tabIndex={i === current ? 0 : -1}
          className={`cook-seg${o.value === value ? ' is-on' : ''}`}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
