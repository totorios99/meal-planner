import 'server-only'
import { prisma } from '@/lib/prisma'
import { optionalUserId, requireUserId } from '@/lib/auth'
import { coerceRow, DEFAULTS, type Settings, type SettingsPatch } from '@/lib/settings'

// Server-only. Upsert-on-read: no seed migration, and no "row missing" branch anywhere else —
// a user's row appears the first time anything reads their preferences.
//
// `request` is optional because the root layout is a server component with no Request to hand
// over; pass it from route handlers so an admin-secret caller resolves to the owner rather than
// silently reading as signed out.
export async function getSettings(request?: Request): Promise<Settings> {
  // The root layout renders for signed-out visitors too (the sign-in page). Hand them the
  // defaults rather than throwing or, worse, writing a row for nobody.
  const userId = await optionalUserId(request)
  if (!userId) return DEFAULTS

  const row = await prisma.settings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
  return coerceRow(row as unknown as Record<string, unknown>)
}

export async function saveSettings(patch: SettingsPatch, request?: Request): Promise<Settings> {
  const userId = await requireUserId(request)
  const row = await prisma.settings.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  })
  return coerceRow(row as unknown as Record<string, unknown>)
}
