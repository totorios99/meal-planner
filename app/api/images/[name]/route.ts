import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { imageDir } from '@/lib/images'

// ponytail: images are stored flat under one random filename, not per user, so any signed-in
// user who knows a name can fetch it. Names are unguessable in practice (4 random bytes) and
// the route is behind Clerk. Give the file an owner if images ever become sensitive.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
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
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
