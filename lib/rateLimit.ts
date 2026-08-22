/**
 * Fixed-window rate limiter, in process memory.
 *
 * Not a stopgap for a Redis limiter: Mise runs as exactly one container with one
 * Node process (docker-compose.yml, `container_name: mise`), so process memory
 * IS the whole application's state. A shared store would add an external
 * dependency to coordinate a single writer with itself. If this ever runs more
 * than one replica, the counter has to move — that is the trigger, and nothing
 * short of it is.
 *
 * A restart forgives every counter. That is the intended trade: the window is a
 * minute, a restart is rarer than that, and losing a partial count is cheaper
 * than persisting one.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()

/** Windows are only cleaned when the map has grown enough to be worth walking. */
const SWEEP_AT = 512

function sweep(now: number) {
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the window resets. Always ≥ 1 so it can go straight into `Retry-After`. */
  retryAfter: number
  remaining: number
}

/**
 * Count one request against `key`. Returns `ok: false` once `limit` requests
 * have been seen inside `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (windows.size >= SWEEP_AT) sweep(now)

  const current = windows.get(key)
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0, remaining: limit - 1 }
  }

  current.count++
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  if (current.count > limit) {
    return { ok: false, retryAfter, remaining: 0 }
  }
  return { ok: true, retryAfter: 0, remaining: limit - current.count }
}

/** 429 with the header a well-behaved client will actually wait on. */
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: 'Too many requests — slow down and try again.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
  )
}

/** Test seam: drops every counter. Not used by the app. */
export function resetRateLimits() {
  windows.clear()
}
