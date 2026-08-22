import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mealInput, toMealData, stageRangeIssues } from '@/lib/mealSchema'
import { macrosForRefs } from '@/lib/foods'
import { requireUserId, guarded } from '@/lib/auth'

export const GET = guarded(async (request: NextRequest) => {
  const userId = await requireUserId(request)
  const meals = await prisma.meal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(meals)
})

export const POST = guarded(async (request: NextRequest) => {
  const userId = await requireUserId(request)
  const parsed = mealInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const rangeIssues = stageRangeIssues(parsed.data.stages, parsed.data.ingredients.length)
  if (rangeIssues.length > 0) {
    return NextResponse.json({ error: rangeIssues.map(message => ({ message, path: ['stages'] })) }, { status: 400 })
  }
  const data = toMealData(parsed.data)
  const macros = await macrosForRefs(userId, data.ingredients) // cached totals from foods
  const meal = await prisma.meal.create({ data: { userId, ...data, ...macros } })
  return NextResponse.json(meal, { status: 201 })
})
