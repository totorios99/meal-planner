/**
 * A styled tooltip for icon-only controls, replacing the browser's native
 * `title=` — which takes about a second to appear, can't be themed, and never
 * shows up on keyboard focus at all.
 *
 * Pure CSS: the wrap (not the trigger) is the hover target, so the pointer can
 * drift onto the bubble without it flickering out. Coarse pointers get nothing,
 * so keep an `aria-label` on the trigger — that is what carries the meaning for
 * touch and for screen readers.
 */
export function Tooltip({ label, place, children }: {
  label: string
  /** `below` for controls near the top of the viewport, where an above-bubble would clip. */
  place?: 'below'
  children: React.ReactNode
}) {
  return (
    <span className="t-tt-wrap" data-tt-place={place}>
      {children}
      <span className="t-tt" role="tooltip">{label}</span>
    </span>
  )
}
