import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { checkAdminSecret } from '@/lib/adminSecret'

/**
 * The security boundary. proxy.ts is an optimistic gate that keeps signed-out traffic out of
 * the app; this module is what actually decides who owns what, next to the data. Every route
 * handler and every server component that touches the DB starts here.
 */

export class Unauthorized extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'Unauthorized'
  }
}

/**
 * Who this request acts as, or throw.
 *
 * Pass `request` on any route the MCP server calls: an agent has no Clerk session, so a valid
 * x-mise-admin-secret makes it act as MISE_OWNER_USER_ID. Omit it and only a signed-in human
 * gets through. Either way the caller ends up with a concrete userId that scopes every query
 * below it — there is no "unscoped" path out of here.
 */
export async function requireUserId(request?: Request): Promise<string> {
  const { userId } = await auth()
  if (userId) return userId
  if (request && checkAdminSecret(request) === 'valid') return adminOwnerId()
  throw new Unauthorized()
}

/**
 * Page equivalent of requireUserId. A server component has no Request to offer, so a request
 * carrying only the admin secret resolves to nobody there — and throwing rendered a 500 error
 * page. Send them to sign in instead, the same thing the proxy does for an ordinary
 * signed-out visit.
 */
export async function requireUserIdForPage(): Promise<string> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return userId
}

/** As requireUserId, but null instead of a throw — for the few places (the root layout) that
 *  render for signed-out visitors and should fall back to defaults rather than blow up. */
export async function optionalUserId(request?: Request): Promise<string | null> {
  const { userId } = await auth()
  if (userId) return userId
  if (request && checkAdminSecret(request) === 'valid') return adminOwnerId()
  return null
}

/**
 * Operational routes (agent import) authenticate with a shared secret sent strictly as the
 * `x-mise-admin-secret` header — never a query string, never from browser code. A signed-in
 * user's session grants nothing here: importing is not something a regular user can trigger.
 */
export function requireAdmin(request: Request): void {
  if (checkAdminSecret(request) !== 'valid') throw new Unauthorized()
}

/** Whether this request carries a valid admin secret, without throwing. For the one route
 *  (image upload) that accepts either a signed-in user or an agent. */
export function isAdmin(request: Request): boolean {
  return checkAdminSecret(request) === 'valid'
}

/** The user agent-driven imports act on behalf of. Agents have no Clerk session of their own. */
export function adminOwnerId(): string {
  const owner = process.env.MISE_OWNER_USER_ID
  if (!owner) throw new Unauthorized('MISE_OWNER_USER_ID is not configured')
  return owner
}

/**
 * WeeklyPlanDay/WeeklyPlanMeal have no userId of their own — ownership comes from the plan
 * they cascade from. These resolve a nested path id back to its plan and check the owner, so
 * an id guessed from someone else's plan is indistinguishable from one that doesn't exist.
 * Returns null when not owned; callers turn that into a 404.
 */
export async function findOwnedDay(dayId: number, userId: string) {
  const day = await prisma.weeklyPlanDay.findFirst({
    where: { id: dayId, weeklyPlan: { userId } },
  })
  return day ?? null
}

export async function findOwnedPlanMeal(mealEntryId: number, userId: string) {
  const entry = await prisma.weeklyPlanMeal.findFirst({
    where: { id: mealEntryId, weeklyPlanDay: { weeklyPlan: { userId } } },
  })
  return entry ?? null
}

/**
 * Wraps a route handler so an `Unauthorized` thrown anywhere inside it becomes a 401 instead
 * of an uncaught throw, which Next renders as a 500.
 *
 * Every handler calls `requireUserId` and only two used to catch what it throws, so a
 * signed-out request answered 500 on most of the API. `proxy.ts` masks that in production by
 * rejecting `/api/*` first — but it is optimistic by design, and its own comment records that
 * Clerk's middleware detection fails intermittently, which is exactly when a handler runs
 * without a session. A 500 there also leaks a stack trace on a path an unauthenticated caller
 * controls, and tells the client nothing about signing in again.
 *
 * Applied at the export so the handler body stays a plain function:
 *   export const GET = guarded(async (request: NextRequest) => { … })
 */
export function guarded<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args)
    } catch (err) {
      const res = unauthorizedResponse(err)
      if (res) return res
      throw err
    }
  }
}

/** Turn an Unauthorized into a 401 JSON response; rethrow anything else. */
export function unauthorizedResponse(err: unknown): Response | null {
  if (err instanceof Unauthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
