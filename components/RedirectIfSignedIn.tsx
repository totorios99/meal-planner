'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// On a Clerk *development* instance the session lives on the accounts.dev origin, so the first
// request from a new device reaches the proxy without a readable session cookie and gets
// redirected here — then Clerk JS hydrates, finds the session, and <SignIn> renders nothing
// because it never mounts a form for a signed-in user. Result: a blank sign-in page that works
// after a manual reload. Bounce to the app instead. A production Clerk instance (real domain +
// HTTPS) removes the cross-origin hop and makes this dead code.
export function RedirectIfSignedIn() {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/')
  }, [isLoaded, isSignedIn, router])

  return null
}
