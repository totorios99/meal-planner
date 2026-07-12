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
  const name = `${Date.now().toString(36)}${randomBytes(4).toString('hex')}.jpg`
  const dir = imageDir()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()))
  return NextResponse.json({ url: `/api/images/${name}` }, { status: 201 })
}
