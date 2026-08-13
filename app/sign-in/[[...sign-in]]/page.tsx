import { SignIn } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerkAppearance'

export const dynamic = 'force-dynamic'

export default function SignInPage() {
  return (
    <main className="auth-arrive" style={{ maxWidth: 420, margin: "12vh auto", padding: "0 20px" }}>
      <p className="page-eyebrow">Mise</p>
      <h1 className="page-title">
        Sign in to <em>Mise</em>
      </h1>
      <div style={{ marginTop: 24 }}>
        <SignIn appearance={authAppearance} />
      </div>
    </main>
  )
}
