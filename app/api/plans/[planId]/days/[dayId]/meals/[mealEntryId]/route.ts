import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ingredientSchema } from '@/lib/mealSchema'

const putSchema = z.object({ ingredients: z.array(ingredientSchema) })

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mealEntryId: string }> }
) {
  const { mealEntryId } = await params
  const parsed = putSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const entry = await prisma.weeklyPlanMeal.update({
    where: { id: Number(mealEntryId) },
    data: { ingredients: JSON.stringify(parsed.data.ingredients) },
    include: { meal: true }
  })
  return NextResponse.json(entry)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mealEntryId: string }> }
) {
  const { mealEntryId } = await params
  try {
    await prisma.weeklyPlanMeal.delete({ where: { id: Number(mealEntryId) } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
