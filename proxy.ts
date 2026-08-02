import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { checkAdminSecret } from '@/lib/adminSecret'

// Next 16 renamed middleware.ts to proxy.ts; the contract is unchanged, so clerkMiddleware
// still works as the default export.
//
// For signed-in humans this is an OPTIMISTIC gate only. It turns signed-out browsers away and
// 401s signed-out API calls, but it is not the security boundary — every query is scoped by
// userId in the route handler via lib/auth.ts. See
// node_modules/next/dist/docs/01-app/02-guides/authentication.md ("Proxy ... should not be
// your only line of defense").

// Plain prefix checks rather than Clerk's createRouteMatcher, which is deprecated: it warned
// that path matching in middleware can diverge from how Next.js actually routes a request. The
// real protection doesn't live here anyway (see above), so a pattern that drifted would cost a
// redirect, not a leak.
const PUBLIC_PREFIXES = ['/sign-in', '/sign-up']

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl
  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) return

  // Agents and the MCP server have no Clerk session; they authenticate with a shared secret in
  // the x-mise-admin-secret header. Reject a wrong one here with a 401 rather than letting it
  // fall through to Clerk, which would report it as a plain sign-in problem. A valid one skips
  // the session check — the route still resolves the acting user through requireUserId().
  const admin = checkAdminSecret(request)
  if (admin === 'invalid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (admin === 'valid') return

  // auth.protect() answers an unauthenticated API call with a redirect (or a 404), which is
  // useless to a non-browser client: a POST would be bounced to the sign-in page as a 307.
  // API routes get a plain 401 instead; only page requests are redirected.
  if (pathname.startsWith('/api/')) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return
  }

  // Send signed-out page requests to our own /sign-in, not Clerk's hosted account portal.
  // Passing the URL explicitly rather than trusting NEXT_PUBLIC_CLERK_SIGN_IN_URL: on a dev
  // instance Clerk ignored that and redirected to <slug>.accounts.dev anyway, which would take
  // a LAN/Tailscale user off-box for a page this app already renders.
  await auth.protect({
    unauthenticatedUrl: new URL('/sign-in', request.nextUrl.origin).toString(),
  })
}, {
  // The Content-Security-Policy is emitted here rather than in next.config.ts because Clerk's
  // Frontend API lives on a per-instance host — *.clerk.accounts.dev in development,
  // clerk.<your-domain> in production — which a static allowlist can't know. Clerk merges its
  // own origins (plus the Cloudflare Turnstile frame its bot check needs) into these.
  contentSecurityPolicy: {
    directives: {
      // Uploaded meal photos are served from this origin; data:/blob: cover the crop preview
      // in PhotoInput before an upload has a URL.
      'img-src': ['self', 'data:', 'blob:'],
      'font-src': ['self', 'data:'],
      // Belt and braces with the X-Frame-Options: DENY set in next.config.ts.
      'frame-ancestors': ['none'],
      'base-uri': ['self'],
    },
  },
})

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless they carry a query string
    // (a static-looking path with params can still be a route).
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
