import { NextRequest } from 'next/server'

/**
 * Builds the request a route handler is actually called with.
 *
 * `NextRequest`, not a plain `Request`: several handlers read `request.nextUrl.searchParams`,
 * which only exists on the Next wrapper. A plain Request gets as far as the auth check and
 * then throws on `undefined.searchParams`, which looks like an auth bug and is not one.
 */
export function req(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** A request carrying the agent's shared secret instead of a session. */
export function agentReq(url: string, method = 'POST', body?: unknown): NextRequest {
  const r = req(url, method, body)
  r.headers.set('x-mise-admin-secret', process.env.MISE_ADMIN_SECRET!)
  return r
}

/**
 * The second argument Next passes to a dynamic-segment handler.
 *
 * Generic so the returned promise keeps the caller's literal shape — a plain
 * `Record<string, string>` is not assignable to a handler expecting `{ id: string }`.
 */
export function params<T extends Record<string, string>>(o: T): { params: Promise<T> } {
  return { params: Promise.resolve(o) }
}
