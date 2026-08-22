import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { foodInput, toFoodData, foodToJson, canonicalWarnings } from '@/lib/foodSchema'
import { findFoodByName } from '@/lib/foods'
import { requireUserId, guarded } from '@/lib/auth'

// Foods source of truth — the only place nutrients are authored.
export const GET = guarded(async (request: NextRequest) => {
  const userId = await requireUserId(request)
  const search = request.nextUrl.searchParams.get('search')?.trim()
  const foods = await prisma.food.findMany({
    where: search ? { userId, name: { contains: search } } : { userId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(foods.map(foodToJson))
})

export const POST = guarded(async (request: NextRequest) => {
  const userId = await requireUserId(request)
  const parsed = foodInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  if (await findFoodByName(userId, parsed.data.name)) {
    return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
  }
  try {
    const food = await prisma.food.create({ data: { userId, ...toFoodData(parsed.data) } })
    const warnings = canonicalWarnings(parsed.data.nutrients)
    return NextResponse.json({ ...foodToJson(food), ...(warnings.length ? { warnings } : {}) }, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
    }
    throw e
  }
})
