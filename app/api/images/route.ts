import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { randomBytes } from 'crypto'
import { join } from 'path'
import { imageDir } from '@/lib/images'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
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
