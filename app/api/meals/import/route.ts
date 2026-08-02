import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stageLabel } from '@/lib/recipe'
import { importSchema } from '@/lib/mealSchema'
import { importIngredientsToRefs } from '@/lib/foods'
import { requireAdmin, adminOwnerId, unauthorizedResponse } from '@/lib/auth'

// One stage per step, no timer, no ingredient span: the chart degrades to a plain ladder, which
// is the honest fallback when nobody has said which step consumes what.
function ladderFromSteps(steps: string[]) {
  return steps.map((step, i) => ({
    name: stageLabel(step),
    detail: step.trim(),
    timing: '',
    seconds: 0,
    slot: i,
    from: 0,
    to: -1,
  }))
}

export async function POST(request: NextRequest) {
  // Agents have no Clerk session; this route authenticates on the x-mise-admin-secret header
  // alone (never a query param, never a browser cookie) and imports on the owner's behalf.
  // Unset secret = import disabled, never open.
  let userId: string
  try {
    requireAdmin(request)
    userId = adminOwnerId()
  } catch (e) {
    const res = unauthorizedResponse(e)
    if (res) return res
    throw e
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
  const { refs, macros, warnings } = await importIngredientsToRefs(userId, p.ingredients, {
    calories: p.calories, protein: p.protein, carbs: p.carbs, fats: p.fats,
  })
  const meal = await prisma.meal.create({
    data: {
      userId,
      title: p.name,
      description: p.description,
      imageUrl: p.image,
      tag: [...p.categories, ...p.tags].join(', '),
      ingredients: JSON.stringify(refs),
      steps: JSON.stringify(p.steps),
      // An import that didn't work out the chart still gets the step ladder the backfill migration
      // gave every older meal — otherwise cook mode greets a brand-new recipe with an empty state.
      stages: JSON.stringify(p.stages.length > 0 ? p.stages : ladderFromSteps(p.steps)),
      prepMinutes: p.prepMinutes,
      cookMinutes: p.cookMinutes,
      servings: p.servings,
      ...macros,
    },
  })
  // Warnings, not errors: the meal is saved, but the agent needs to know a unit was reinterpreted.
  return NextResponse.json(warnings.length > 0 ? { ...meal, warnings } : meal, { status: 201 })
}
