import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const meals = await prisma.meal.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(meals)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const meal = await prisma.meal.create({
    data: {
      title: body.title,
      description: body.description ?? '',
      calories: Number(body.calories),
      protein: Number(body.protein),
      carbs: Number(body.carbs),
      fats: Number(body.fats),
      imageUrl: body.imageUrl ?? '',
    }
  })
  return NextResponse.json(meal, { status: 201 })
}
