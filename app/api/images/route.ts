import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { randomBytes } from 'crypto'
import { join } from 'path'
import { imageDir } from '@/lib/images'
import { isAdmin, optionalUserId } from '@/lib/auth'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'

const MAX_BYTES = 5 * 1024 * 1024
// Every accepted upload is a 5MB disk write with no storage quota behind it, so
// the limit is what stops an authenticated client filling /DATA in a loop. A
// human adding photos to recipes never approaches 20 in a minute.
const UPLOADS_PER_MINUTE = 20

export async function POST(request: NextRequest) {
  // Two legitimate callers with different credentials: the in-app uploader (a signed-in Clerk
  // user) and the MCP server (the admin secret header). proxy.ts admits both — it lets a valid
  // admin secret through without a session — so this is where the two are actually told apart.
  // Accept either, reject everything else.
  const userId = await optionalUserId()
  const admin = isAdmin(request)
  if (!userId && !admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Keyed on the caller, not the IP: behind Tailscale and the reverse proxy every
  // request arrives from the same handful of addresses, so an IP key would either
  // limit everyone at once or nobody.
  const limit = rateLimit(`upload:${userId ?? 'agent'}`, UPLOADS_PER_MINUTE, 60_000)
  if (!limit.ok) return tooManyRequests(limit)

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 })
  }
  // Trust the bytes, not the client's Content-Type: the extension decides what
  // /api/images/[name] serves it back as, so a mislabelled upload would be served
  // under a type it isn't. PNG preserves transparency (product-shot cutouts).
  const buf = Buffer.from(await file.arrayBuffer())
  const isPng = buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  if (!isPng && !isJpg) {
    return NextResponse.json({ error: 'Only PNG or JPEG images are accepted' }, { status: 415 })
  }
  const name = `${Date.now().toString(36)}${randomBytes(4).toString('hex')}.${isPng ? 'png' : 'jpg'}`
  const dir = imageDir()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), buf)
  return NextResponse.json({ url: `/api/images/${name}` }, { status: 201 })
}
