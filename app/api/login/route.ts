import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { SESSION_COOKIE, sessionValue } from '@/proxy'

function equals(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

// Plain form post — no client JS, no login library. Wrong key just re-renders /login.
export async function POST(request: NextRequest) {
  const key = process.env.MISE_API_KEY
  const form = await request.formData()
  const sent = String(form.get('key') ?? '')

  if (!key || !equals(sent, key)) {
    return NextResponse.redirect(new URL('/login?bad=1', request.url), 303)
  }

  const res = NextResponse.redirect(new URL('/', request.url), 303)
  res.cookies.set(SESSION_COOKIE, sessionValue(key), {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
