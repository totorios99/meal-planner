'use client'
import { useAuth } from '@clerk/nextjs'

// Stand-in for Clerk's card while clerk.js loads. The slot already reserves the height, so this
// isn't holding the layout open — it's there so the second between the heading and the form
// reads as loading rather than as a page that forgot to render anything.
//
// Deliberately the card's silhouette (social button, divider, two fields, submit) and not a
// spinner: it lands in the same place the real controls do, so the swap is a fill rather than a
// change of shape.
export function AuthSkeleton() {
  return (
    <div className="auth-skeleton" aria-hidden="true">
      <div className="auth-skeleton-btn shimmer" />
      <div className="auth-skeleton-divider">
        <span className="shimmer" />
      </div>
      <div className="auth-skeleton-field shimmer" />
      <div className="auth-skeleton-field shimmer" />
      <div className="auth-skeleton-btn shimmer" />
    </div>
  )
}

/**
 * Holds both layers on the same coordinates and cross-fades them once Clerk is
 * up. `ClerkLoading`/`ClerkLoaded` swap by unmounting, which is a cut — one
 * card is simply replaced by another. Keeping the skeleton painted through the
 * reveal is what makes it read as the form filling in.
 *
 * `isLoaded` only drives the class; the caller still gates the real widget on
 * `ClerkLoaded`, so nothing about when `<SignIn>` mounts changes here.
 */
export function AuthReveal({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth()
  return (
    <div className={`auth-widget t-skel${isLoaded ? ' is-revealed' : ''}`}>
      {/* No `is-pulsing`: the bars already carry the app's own shimmer, and
          running both would be two loading animations on one card. */}
      <div className="t-skel-skeleton"><AuthSkeleton /></div>
      <div className="t-skel-content">{children}</div>
    </div>
  )
}
