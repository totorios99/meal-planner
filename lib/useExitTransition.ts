'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Reads a duration token (e.g. `--modal-close-dur`) as a number of ms. */
export function motionMs(token: string, fallback: number) {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token)
  return parseFloat(raw) || fallback
}

/**
 * Keeps a conditionally-rendered surface mounted through its close transition.
 *
 * React unmounts the moment a flag flips, which is why every sheet and menu in
 * this app animated in and then simply vanished. This holds the node for
 * `closeMs` while the `t-modal` / `t-dropdown` closing state plays, and delays
 * `is-open` by a frame on the way in so the transition starts from the
 * pre-open scale instead of skipping to the resting one.
 *
 * Returns `[mounted, stateClass]` — render nothing while `mounted` is false,
 * and append `stateClass` to the surface's className.
 */
export function useExitTransition(open: boolean, closeMs: number) {
  const [state, setState] = useState('')
  const [closing, setClosing] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  // Adjusted during render rather than in an effect: the surface has to paint
  // its closing state in the SAME commit that `open` went false, or the node is
  // gone before the transition can start.
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setClosing(false)
      setState('')          // the pre-open rest state; the effect below opens it
    } else {
      setClosing(true)
      setState('is-closing')
    }
  }

  useEffect(() => {
    if (!open) return
    // Two frames: the first paints the pre-open state, the second transitions
    // off it. One frame is not enough — React can batch both into one paint.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setState('is-open'))
    })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [open])

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => { setClosing(false); setState('') }, closeMs)
    return () => clearTimeout(t)
  }, [closing, closeMs])

  return [open || closing, state] as const
}

/**
 * The same idea for a surface that is mounted by its PARENT (every `.sheet` in
 * this app: `{editing && <MealModal onClose={…} />}`). The modal can't hold its
 * own mount, so it plays the closing state first and only then tells the parent
 * to drop it.
 *
 * Returns `[stateClass, close]` — spread the class onto the sheet and its
 * backdrop, and call `close()` everywhere the raw `onClose` used to be called.
 */
export function useSheetTransition(onClose: () => void) {
  const [state, setState] = useState('')
  const closing = useRef(false)

  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setState('is-open'))
    })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [])

  const close = useCallback(() => {
    if (closing.current) return   // a second Escape/backdrop click must not restart the clock
    closing.current = true
    setState('is-closing')
    setTimeout(onClose, motionMs('--modal-close-dur', 150))
  }, [onClose])

  return [state, close] as const
}
