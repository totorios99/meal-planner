import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { foodInput, foodToJson, canonicalWarnings } from '@/lib/foodSchema'
import { recomputeMealCache, findFoodByName } from '@/lib/foods'
import { parseRefs } from '@/lib/recipe'
import { requireUserId, guarded } from '@/lib/auth'

export const PUT = guarded(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await requireUserId(request)
  const { id } = await params
  const existing = await prisma.food.findFirst({ where: { id: Number(id), userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const raw = await request.json()
  // Partial update: only the keys the caller actually sent are changed, so an agent tweaking
  // just baseUnit/measures can't silently wipe nutrients (or vice versa) via a full-object
  // replace. Mirrors the same pattern already used for meals in app/api/meals/[id]/route.ts.
  const parsed = foodInput.partial().safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const d = parsed.data
  const has = (k: string) => raw != null && typeof raw === 'object' && k in raw
  const foodId = Number(id)
  if (has('name') && d.name && await findFoodByName(userId, d.name, foodId)) {
    return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
  }
  const data: Record<string, unknown> = {}
  if (has('name')) data.name = d.name
  if (has('baseUnit')) data.baseUnit = d.baseUnit
  if (has('imageUrl')) data.imageUrl = d.imageUrl
  if (has('isPlaceholder')) data.isPlaceholder = d.isPlaceholder
  if (has('nutrients')) data.nutrients = JSON.stringify(d.nutrients ?? [])
  if (has('measures')) data.measures = JSON.stringify(d.measures ?? [])

  try {
    const food = await prisma.food.update({ where: { id: foodId }, data })
    // Propagate: macros are derived, so refresh cached totals — but only when something that
    // affects them actually changed, and only on the meals that reference this food.
    if (has('nutrients') || has('measures') || has('isPlaceholder')) {
      const meals = await prisma.meal.findMany({ where: { userId }, select: { id: true, ingredients: true } })
      const affected = meals.filter(m => parseRefs(m.ingredients).some(r => r.foodId === foodId)).map(m => m.id)
      if (affected.length) await recomputeMealCache(userId, affected)
    }
    const warnings = has('nutrients') ? canonicalWarnings(d.nutrients ?? []) : []
    return NextResponse.json({ ...foodToJson(food), ...(warnings.length ? { warnings } : {}) })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
})

export const DELETE = guarded(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await requireUserId(request)
  const { id } = await params
  const foodId = Number(id)
  const existing = await prisma.food.findFirst({ where: { id: foodId, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Block if any of this user's meals or placements references this food. Scoped to them:
  // a food id is only ever referenced from its own owner's rows.
  const [meals, placements] = await Promise.all([
    prisma.meal.findMany({ where: { userId }, select: { ingredients: true } }),
    prisma.weeklyPlanMeal.findMany({
      where: { weeklyPlanDay: { weeklyPlan: { userId } } },
      select: { ingredients: true },
    }),
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
})
