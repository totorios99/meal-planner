import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meal = await prisma.meal.findUnique({ where: { id: Number(id) } })
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(meal)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const meal = await prisma.meal.update({
    where: { id: Number(id) },
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
  return NextResponse.json(meal)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.meal.delete({ where: { id: Number(id) } })
  return NextResponse.json({ deleted: true })
}
