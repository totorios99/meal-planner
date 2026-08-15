import { SignIn, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerkAppearance'
import { AuthSkeleton } from '@/components/AuthSkeleton'

export const dynamic = 'force-dynamic'

export default function SignInPage() {
  return (
    <main className="auth-arrive" style={{ maxWidth: 420, margin: "12vh auto", padding: "0 20px" }}>
      <p className="page-eyebrow">Mise</p>
      <h1 className="page-title">
        Sign in to <em>Mise</em>
      </h1>
      <div className="auth-widget" style={{ marginTop: 24 }}>
        <ClerkLoading><AuthSkeleton /></ClerkLoading>
        <ClerkLoaded><SignIn appearance={authAppearance} /></ClerkLoaded>
      </div>
    </main>
  )
}
