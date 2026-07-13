import { BackLink } from '@/components/BackLink'

export default function Loading() {
  return (
    <main className="recipe-page">
      <BackLink />
      <div className="recipe-hero shimmer" />
      <div className="shimmer meal-skeleton-bar" style={{ height: 34, width: '60%', marginTop: 18 }} />
      <div className="recipe-columns" style={{ marginTop: 24 }}>
        <div className="shimmer recipe-panel" style={{ height: 260 }} />
        <div className="shimmer recipe-panel" style={{ height: 260 }} />
      </div>
    </main>
  )
}
