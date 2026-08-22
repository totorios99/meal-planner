import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { refSchema } from '@/lib/mealSchema'
import { requireUserId, findOwnedPlanMeal, guarded } from '@/lib/auth'

const putSchema = z.object({ ingredients: z.array(refSchema) })
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

export const PUT = guarded(async (
  request: NextRequest,
  { params }: { params: Promise<{ mealEntryId: string }> }
) => {
  const userId = await requireUserId(request)
  const { mealEntryId } = await params
  const owned = await findOwnedPlanMeal(Number(mealEntryId), userId)
  if (!owned) return notFound()

  const parsed = putSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const entry = await prisma.weeklyPlanMeal.update({
    where: { id: owned.id },
    data: { ingredients: JSON.stringify(parsed.data.ingredients) },
    include: { meal: true }
  })
  return NextResponse.json(entry)
})

export const DELETE = guarded(async (
  request: NextRequest,
  { params }: { params: Promise<{ mealEntryId: string }> }
) => {
  const userId = await requireUserId(request)
  const { mealEntryId } = await params
  const owned = await findOwnedPlanMeal(Number(mealEntryId), userId)
  if (!owned) return notFound()
  await prisma.weeklyPlanMeal.delete({ where: { id: owned.id } })
  return NextResponse.json({ deleted: true })
})
