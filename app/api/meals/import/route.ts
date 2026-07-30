import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { importSchema } from '@/lib/mealSchema'
import { importIngredientsToRefs } from '@/lib/foods'

export async function POST(request: NextRequest) {
  const key = process.env.MISE_API_KEY
  // Unset key = import disabled, never open
  if (!key || request.headers.get('x-api-key') !== key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const p = parsed.data
  const { refs, macros } = await importIngredientsToRefs(p.ingredients, {
    calories: p.calories, protein: p.protein, carbs: p.carbs, fats: p.fats,
  })
  const meal = await prisma.meal.create({
    data: {
      title: p.name,
      description: p.description,
      imageUrl: p.image,
      tag: [...p.categories, ...p.tags].join(', '),
      ingredients: JSON.stringify(refs),
      steps: JSON.stringify(p.steps),
      stages: JSON.stringify(p.stages),
      prepMinutes: p.prepMinutes,
      cookMinutes: p.cookMinutes,
      servings: p.servings,
      ...macros,
    },
  })
  return NextResponse.json(meal, { status: 201 })
}
