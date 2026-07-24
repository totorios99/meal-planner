'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption { value: string; label: string }

interface Props {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

// A native <select>'s open popup can't be restyled (border-radius/shadow/font are up to the
// OS in every browser) — this renders the closed state as a normal button and the open list
// as a portalled, app-styled menu positioned from the trigger's live bounding rect.
export function Select({ value, options, onChange, disabled, className }: Props) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function reposition() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width })
  }

  useEffect(() => {
    if (!open) return
    reposition()
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const current = options.find(o => o.value === value)

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`ui-select-trigger${className ? ' ' + className : ''}`}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
      >
        <span className="ui-select-value">{current?.label ?? ''}</span>
      </button>
      {open && rect && createPortal(
        <div ref={menuRef} className="ui-select-menu" style={{ top: rect.top, left: rect.left, width: rect.width }}>
          {options.map(o => (
            <div
              key={o.value}
              className={`ui-select-option${o.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
