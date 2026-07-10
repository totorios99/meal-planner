import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mealInput, toMealData } from '@/lib/mealSchema'

export async function GET() {
  const meals = await prisma.meal.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(meals)
}

export async function POST(request: NextRequest) {
  const parsed = mealInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const meal = await prisma.meal.create({ data: toMealData(parsed.data) })
  return NextResponse.json(meal, { status: 201 })
}
