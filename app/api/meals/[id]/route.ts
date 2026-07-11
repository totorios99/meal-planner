import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { mealInput, toMealData } from '@/lib/mealSchema'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meal = await prisma.meal.findUnique({ where: { id: Number(id) } })
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(meal)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = mealInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const meal = await prisma.meal.update({
    where: { id: Number(id) },
    data: toMealData(parsed.data),
  })
  return NextResponse.json(meal)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = z.object({ isFavorite: z.boolean() }).safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  if (parsed.data.isFavorite) {
    const favCount = await prisma.meal.count({
      where: { isFavorite: true, id: { not: Number(id) } },
    })
    if (favCount >= 5) {
      return NextResponse.json(
        { error: 'Max 5 favorites — unfavorite one first' },
        { status: 409 }
      )
    }
  }
  const meal = await prisma.meal.update({
    where: { id: Number(id) },
    data: { isFavorite: parsed.data.isFavorite },
  })
  return NextResponse.json(meal)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inPlans = await prisma.weeklyPlanMeal.count({ where: { mealId: Number(id) } })
  if (inPlans > 0) {
    return NextResponse.json(
      { error: 'Meal is used in a weekly plan — remove it from plans first' },
      { status: 409 }
    )
  }
  try {
    await prisma.meal.delete({ where: { id: Number(id) } })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ deleted: true })
}
