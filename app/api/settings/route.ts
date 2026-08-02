import { NextRequest, NextResponse } from 'next/server'
import { settingsPatch } from '@/lib/settings'
import { getSettings, saveSettings } from '@/lib/settings.server'

// No auth check here on purpose: proxy.ts turns signed-out traffic away, and getSettings/
// saveSettings resolve the acting user themselves — there is no unscoped settings row to reach.
//
// `request` is threaded into both so a caller holding the admin secret rather than a Clerk
// session resolves to the owner. Without it, GET quietly answered with DEFAULTS instead of the
// owner's saved targets, and PATCH threw its way to a 500.

export async function GET(request: NextRequest) {
  return NextResponse.json(await getSettings(request))
}

export async function PATCH(request: NextRequest) {
  const parsed = settingsPatch.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  return NextResponse.json(await saveSettings(parsed.data, request))
}
