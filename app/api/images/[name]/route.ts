import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { imageDir } from '@/lib/images'
import { requireUserId, unauthorizedResponse, guarded } from '@/lib/auth'

// ponytail: images are stored flat under one random filename, not per user, so any signed-in
// user who knows a name can fetch it. Names are unguessable in practice (4 random bytes).
// Give the file an owner if images ever become sensitive.
export const GET = guarded(async (request: NextRequest, { params }: { params: Promise<{ name: string }> }) => {
  // Authorization happens next to the data, not in proxy.ts. This route used to be the one
  // exception in the app — its only gate was the optimistic proxy check, which the Next docs
  // (and AGENTS.md rule 6) say is not a security boundary.
  try {
    await requireUserId(request)
  } catch (err) {
    const res = unauthorizedResponse(err)
    if (res) return res
    throw err
  }

  const { name } = await params
  const match = /^[a-z0-9]+\.(jpg|png)$/.exec(name)
  if (!match) {
    return NextResponse.json({ error: 'Bad name' }, { status: 400 })
  }
  try {
    const buf = await readFile(join(imageDir(), name))
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': match[1] === 'png' ? 'image/png' : 'image/jpeg',
        // `private`, not `public`: the response is authenticated now, and a shared
        // cache in front of the app (the Nginx Proxy Manager on :443) must not hand
        // one user's image to the next requester.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
})
