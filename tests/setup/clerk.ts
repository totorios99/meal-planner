/**
 * Stands in for `@clerk/nextjs/server` in the `api` project, wired up as a Vite alias
 * rather than a `vi.mock`.
 *
 * The alias is resolved before any module executes, so there is no hoisting order to reason
 * about and no `vi.mocked()` handle to thread around — a test just calls `actAs()` and the
 * route sees that user.
 *
 * Why a fake at all: the real `auth()` calls `next/headers`, which rejects outside a Next
 * request scope, so a route handler cannot be invoked at all without this.
 *
 * The surface is deliberately tiny. Routes only ever destructure `{ userId }`. If one starts
 * reaching for `sessionId` or `protect()`, it gets `undefined` and fails loudly rather than
 * quietly passing — which is the behaviour you want from a fake standing in for a security
 * boundary.
 */
let currentUserId: string | null = null

/** Act as this Clerk user for every subsequent request. `null` = signed out. */
export function actAs(userId: string | null) {
  currentUserId = userId
}

export async function auth() {
  return { userId: currentUserId }
}
