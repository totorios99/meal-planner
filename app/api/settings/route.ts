import { NextRequest, NextResponse } from 'next/server'
import { settingsPatch } from '@/lib/settings'
import { getSettings, saveSettings } from '@/lib/settings.server'
import { guarded, optionalUserId } from '@/lib/auth'

// `request` is threaded into getSettings/saveSettings so a caller holding the admin secret rather
// than a Clerk session resolves to the owner. Without it, GET quietly answered with DEFAULTS
// instead of the owner's saved targets, and PATCH threw its way to a 500.

// 401 rather than DEFAULTS when no user resolves. The proxy already turns signed-out traffic
// away, so reaching here without a user means auth() failed on a request that should have had one
// — production logs "Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()".
// Answering 200 with defaults told the client those defaults WERE the user's preferences, and it
// applied them: a Sunday-start week became Monday, and the planner created the wrong week. An
// error the client can see leaves the last known values alone.
export const GET = guarded(async (request: NextRequest) => {
  const userId = await optionalUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getSettings(request))
})

// saveSettings calls requireUserId internally, so the Unauthorized surfaces here rather than
// from a call in this file — guarded() catches it either way.
export const PATCH = guarded(async (request: NextRequest) => {
  const parsed = settingsPatch.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  return NextResponse.json(await saveSettings(parsed.data, request))
})
