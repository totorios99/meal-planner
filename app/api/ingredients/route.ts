import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Personal ingredient library — pick-list source. Macros are per 1 unit.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim()
  const ingredients = await prisma.ingredient.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(ingredients)
}

const upsertSchema = z.object({
  name: z.string().trim().min(1),
  unit: z.string().default(''),
  calories: z.coerce.number().min(0).default(0),
  protein: z.coerce.number().min(0).default(0),
  carbs: z.coerce.number().min(0).default(0),
  fats: z.coerce.number().min(0).default(0),
})

// Upsert on (name, unit) so the library self-grows as ingredients are entered.
export async function POST(request: NextRequest) {
  const parsed = upsertSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const { name, unit, ...macros } = parsed.data
  const ingredient = await prisma.ingredient.upsert({
    where: { name_unit: { name, unit } },
    create: { name, unit, ...macros },
    update: macros,
  })
  return NextResponse.json(ingredient, { status: 201 })
}
