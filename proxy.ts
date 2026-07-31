import { NextResponse, type NextRequest } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

// Single-user gate. Same convention the import route already used: no MISE_API_KEY set
// = auth disabled (local dev), so nothing changes until the key exists.
//
// Two ways in, both proving knowledge of the same secret:
//   - x-api-key header  → agents / MCP
//   - mise_session cookie holding sha256(key) → browser, set by POST /api/login
// ponytail: no user table, no session store, no expiry — one person, one secret. Add a real
// session store the day a second person needs their own login.

export const SESSION_COOKIE = 'mise_session'

export function sessionValue(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

function equals(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function proxy(request: NextRequest) {
  const key = process.env.MISE_API_KEY
  if (!key) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next()

  const header = request.headers.get('x-api-key')
  const cookie = request.cookies.get(SESSION_COOKIE)?.value
  if ((header && equals(header, key)) || (cookie && equals(cookie, sessionValue(key)))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // Everything except Next's own static output. Images are served by /api/images/[name],
  // which stays behind the gate on purpose.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
