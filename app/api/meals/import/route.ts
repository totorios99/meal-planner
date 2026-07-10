import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { importSchema, importToMealData } from '@/lib/mealSchema'

export async function POST(request: NextRequest) {
  const key = process.env.MISE_API_KEY
  // Unset key = import disabled, never open
  if (!key || request.headers.get('x-api-key') !== key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const meal = await prisma.meal.create({ data: importToMealData(parsed.data) })
  return NextResponse.json(meal, { status: 201 })
}
