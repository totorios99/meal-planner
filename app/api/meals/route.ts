import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mealInput, toMealData } from '@/lib/mealSchema'
import { macrosForRefs } from '@/lib/foods'

export async function GET() {
  const meals = await prisma.meal.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(meals)
}

export async function POST(request: NextRequest) {
  const parsed = mealInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const data = toMealData(parsed.data)
  const macros = await macrosForRefs(data.ingredients) // cached totals from foods
  const meal = await prisma.meal.create({ data: { ...data, ...macros } })
  return NextResponse.json(meal, { status: 201 })
}
