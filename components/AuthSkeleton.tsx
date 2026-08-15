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
