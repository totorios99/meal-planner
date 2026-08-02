import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { mealInput, stageRangeIssues } from '@/lib/mealSchema'
import { macrosForRefs } from '@/lib/foods'
import { parseRefs } from '@/lib/recipe'
import { requireUserId } from '@/lib/auth'

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

// Prisma needs a unique `where` for update/delete, so ownership can't ride along in the same
// call — every mutation below resolves the meal with a userId-scoped findFirst first. Someone
// else's id therefore looks exactly like a nonexistent one: 404, never 403, which is also what
// stops the endpoint being used to probe whether an id exists.
async function ownedMeal(id: string, userId: string) {
  return prisma.meal.findFirst({ where: { id: Number(id), userId } })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request)
  const { id } = await params
  const meal = await ownedMeal(id, userId)
  if (!meal) return notFound()
  return NextResponse.json(meal)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request)
  const { id } = await params
  const existing = await ownedMeal(id, userId)
  if (!existing) return notFound()

  const raw = await request.json()
  // Partial update: only the keys the caller actually sent are changed, so an agent can
  // update just the title without wiping description/tag/steps/servings. (The modal always
  // sends every field, so it still behaves as a full replace.)
  const parsed = mealInput.partial().safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const d = parsed.data
  const has = (k: string) => raw != null && typeof raw === 'object' && k in raw
  const data: Record<string, unknown> = {}
  for (const k of ['title', 'description', 'tag', 'imageUrl', 'prepMinutes', 'cookMinutes', 'servings'] as const) {
    if (has(k)) data[k] = d[k]
  }
  if (has('steps')) data.steps = JSON.stringify(d.steps ?? [])
  if (has('stages')) {
    // Stage ranges point at the ingredient list they'll be rendered against: the one in this
    // payload if it carries ingredients, otherwise the one already stored.
    const count = has('ingredients')
      ? (d.ingredients ?? []).length
      : parseRefs(existing.ingredients).length
    const rangeIssues = stageRangeIssues(d.stages ?? [], count)
    if (rangeIssues.length > 0) {
      return NextResponse.json({ error: rangeIssues.map(message => ({ message, path: ['stages'] })) }, { status: 400 })
    }
    data.stages = JSON.stringify(d.stages ?? [])
  }
  if (has('ingredients')) {
    data.ingredients = JSON.stringify(d.ingredients ?? [])
    Object.assign(data, await macrosForRefs(userId, data.ingredients as string))
  }
  const meal = await prisma.meal.update({ where: { id: existing.id }, data })
  return NextResponse.json(meal)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request)
  const { id } = await params
  const existing = await ownedMeal(id, userId)
  if (!existing) return notFound()

  const parsed = z.object({ isFavorite: z.boolean() }).safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  if (parsed.data.isFavorite) {
    // The cap is per user — one person filling their five must not lock anyone else out.
    const favCount = await prisma.meal.count({
      where: { userId, isFavorite: true, id: { not: existing.id } },
    })
    if (favCount >= 5) {
      return NextResponse.json(
        { error: 'Max 5 favorites — unfavorite one first' },
        { status: 409 }
      )
    }
  }
  const meal = await prisma.meal.update({
    where: { id: existing.id },
    data: { isFavorite: parsed.data.isFavorite },
  })
  return NextResponse.json(meal)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request)
  const { id } = await params
  const existing = await ownedMeal(id, userId)
  if (!existing) return notFound()

  // Scoped to this user's own plans rather than relying on the placement route to have
  // refused a cross-owner mealId. Kept self-contained so a future shared-recipe feature
  // can't make one person's plan block another person's delete.
  const inPlans = await prisma.weeklyPlanMeal.count({
    where: { mealId: existing.id, weeklyPlanDay: { weeklyPlan: { userId } } },
  })
  if (inPlans > 0) {
    return NextResponse.json(
      { error: 'Meal is used in a weekly plan — remove it from plans first' },
      { status: 409 }
    )
  }
  await prisma.meal.delete({ where: { id: existing.id } })
  return NextResponse.json({ deleted: true })
}
