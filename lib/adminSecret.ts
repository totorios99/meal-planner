import { timingSafeEqual } from 'node:crypto'

// Shared by proxy.ts and lib/auth.ts. It lives in its own file because lib/auth.ts is
// `server-only` and pulls in Prisma, neither of which belongs in the proxy.

export const ADMIN_HEADER = 'x-mise-admin-secret'

function equals(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Validity of the admin secret on a request. Header only — never a query string, since URLs
 * end up in access logs, proxy logs and browser history.
 *
 * Fails closed: an unset MISE_ADMIN_SECRET means "agent access is off", not "let everyone in".
 */
export function checkAdminSecret(request: Request): 'valid' | 'invalid' | 'absent' {
  const header = request.headers.get(ADMIN_HEADER)
  if (!header) return 'absent'
  const secret = process.env.MISE_ADMIN_SECRET
  if (!secret || !equals(header, secret)) return 'invalid'
  return 'valid'
}
