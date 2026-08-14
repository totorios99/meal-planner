import { SignUp } from '@clerk/nextjs'
import { RedirectIfSignedIn } from '@/components/RedirectIfSignedIn'
import { authAppearance } from '@/lib/clerkAppearance'

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  return (
    <>
    <RedirectIfSignedIn />
    <main className="auth-arrive" style={{ maxWidth: 420, margin: "12vh auto", padding: "0 20px" }}>
      <p className="page-eyebrow">Mise</p>
      <h1 className="page-title">
        Join <em>Mise</em>
      </h1>
      <div style={{ marginTop: 24 }}>
        <SignUp appearance={authAppearance} />
      </div>
    </main>
    </>
  )
}
