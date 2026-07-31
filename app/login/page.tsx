export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ bad?: string }>
}) {
  const { bad } = await searchParams
  return (
    <main style={{ maxWidth: 380, margin: '18vh auto', padding: '0 20px' }}>
      <p className="page-eyebrow">Mise</p>
      <h1 className="page-title">Sign in</h1>
      <form method="post" action="/api/login" style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        <input
          type="password"
          name="key"
          autoFocus
          placeholder="Access key"
          aria-label="Access key"
          style={{ padding: '10px 12px', font: 'inherit' }}
        />
        <button type="submit" style={{ padding: '10px 12px', font: 'inherit' }}>
          Enter
        </button>
        {bad && <p style={{ color: 'var(--danger, crimson)' }}>Wrong key.</p>}
      </form>
    </main>
  )
}
