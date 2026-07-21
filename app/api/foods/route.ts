import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { foodInput, toFoodData, foodToJson } from '@/lib/foodSchema'

// Foods source of truth — the only place macros are authored.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')?.trim()
  const foods = await prisma.food.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(foods.map(foodToJson))
}

export async function POST(request: NextRequest) {
  const parsed = foodInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const food = await prisma.food.create({ data: toFoodData(parsed.data) })
    return NextResponse.json(foodToJson(food), { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
    }
    throw e
  }
}
