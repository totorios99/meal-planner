import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stageLabel } from '@/lib/recipe'
import { importSchema } from '@/lib/mealSchema'
import { importIngredientsToRefs } from '@/lib/foods'
import { requireAdmin, adminOwnerId, unauthorizedResponse, guarded } from '@/lib/auth'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'

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

const IMPORTS_PER_MINUTE = 10

export const POST = guarded(async (request: NextRequest) => {
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

  // Every caller here is the one owner acting through an agent, so one window covers
  // the route. An import is a human-paced action — read a recipe, import it — and a
  // run of them faster than this is a loop, not a cook.
  const limit = rateLimit(`import:${userId}`, IMPORTS_PER_MINUTE, 60_000)
  if (!limit.ok) return tooManyRequests(limit)

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
  // Stages that claim no ingredients are legal but lossy: the desktop chart degenerates to a row
  // of captions, and on a phone every ingredient falls into the "Everything you need" catch-all
  // instead of appearing at the step that uses it. That is what a missing `stages` (and so the
  // ladderFromSteps fallback above) produces, and four imported meals shipped that way before
  // anyone noticed. Say so, in the same channel the unit warnings use.
  const claimed = new Set<number>()
  for (const s of p.stages) {
    if (s.to !== undefined && s.from !== undefined && s.to >= s.from) {
      for (let i = s.from; i <= s.to; i++) claimed.add(i)
    }
  }
  const unclaimed = refs.length - claimed.size
  const all = [...warnings]
  if (unclaimed > 0) {
    all.push(
      p.stages.length === 0
        ? `No stages sent, so cook mode fell back to one stage per step with no ingredients attached. Re-send with stages carrying from/to (0-based, inclusive, indices into the ingredients array in cooking order) to get the chart.`
        : `${unclaimed} of ${refs.length} ingredients are not claimed by any stage's from/to range, so they only appear in the phone's catch-all list. Ranges must be contiguous, which means sending ingredients in cooking order.`,
    )
  }

  // Warnings, not errors: the meal is saved, but the agent needs to know a unit was reinterpreted.
  return NextResponse.json(all.length > 0 ? { ...meal, warnings: all } : meal, { status: 201 })
})
