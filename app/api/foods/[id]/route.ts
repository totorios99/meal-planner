import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { foodInput, toFoodData, foodToJson } from '@/lib/foodSchema'
import { recomputeMealCache } from '@/lib/foods'
import { parseRefs } from '@/lib/recipe'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = foodInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const foodId = Number(id)
    const food = await prisma.food.update({ where: { id: foodId }, data: toFoodData(parsed.data) })
    // Propagate: macros are derived, so refresh cached totals — but only on the meals that
    // actually reference this food, not the whole library.
    const meals = await prisma.meal.findMany({ select: { id: true, ingredients: true } })
    const affected = meals.filter(m => parseRefs(m.ingredients).some(r => r.foodId === foodId)).map(m => m.id)
    if (affected.length) await recomputeMealCache(affected)
    return NextResponse.json(foodToJson(food))
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const foodId = Number(id)
  // Block if any meal or placement references this food.
  const [meals, placements] = await Promise.all([
    prisma.meal.findMany({ select: { ingredients: true } }),
    prisma.weeklyPlanMeal.findMany({ select: { ingredients: true } }),
  ])
  const used = [...meals, ...placements].some(r => parseRefs(r.ingredients).some(ref => ref.foodId === foodId))
  if (used) {
    return NextResponse.json({ error: 'Food is used by a meal or plan — remove it there first' }, { status: 409 })
  }
  try {
    await prisma.food.delete({ where: { id: foodId } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
