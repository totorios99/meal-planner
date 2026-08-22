import { SignUp, ClerkLoaded } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerkAppearance'
import { AuthReveal } from '@/components/AuthSkeleton'

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  return (
    <main className="auth-arrive" style={{ maxWidth: 420, margin: "12vh auto", padding: "0 20px" }}>
      <p className="page-eyebrow">Mise</p>
      <h1 className="page-title">
        Join <em>Mise</em>
      </h1>
      <AuthReveal>
        <ClerkLoaded><SignUp appearance={authAppearance} /></ClerkLoaded>
      </AuthReveal>
    </main>
  )
}
