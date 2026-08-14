import { notFound } from 'next/navigation'
import { BackLink } from '@/components/BackLink'
import { prisma } from '@/lib/prisma'
import { parseList, parseRefs, parseStages, refMacros, sumRefs, foodsMap, formatIngredientLine } from '@/lib/recipe'
import { Icon } from '@/components/Icon'
import { MacroRow } from '@/components/meals/MacroRow'
import { FavoriteButton } from '@/components/meals/FavoriteButton'
import { CookMode } from '@/components/meals/CookMode'
import { requireUserIdForPage } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function MealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pm?: string }>
}) {
  const userId = await requireUserIdForPage()
  const { id } = await params
  const { pm } = await searchParams
  const mealId = Number(id)
  if (!Number.isInteger(mealId)) notFound()

  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId } })
  if (!meal) notFound()

  // ?pm=<WeeklyPlanMeal.id> renders this recipe with that placement's edited portions
  const planMealId = Number(pm)
  const placement = Number.isInteger(planMealId)
    ? await prisma.weeklyPlanMeal.findFirst({
        where: { id: planMealId, weeklyPlanDay: { weeklyPlan: { userId } } },
      })
    : null
  const fromPlan = placement?.mealId === meal.id
  const refs = parseRefs(fromPlan ? placement!.ingredients : meal.ingredients)

  const fmap = foodsMap(await prisma.food.findMany({ where: { userId } }))
  const ingredients = refs.map(ref => {
    const food = fmap.get(ref.foodId)
    return { ref, food, macros: refMacros(ref, food) }
  })
  const totals = fromPlan ? sumRefs(refs, fmap) : meal
  const steps = parseList(meal.steps)
  // A stage's from/to index the MEAL's ingredient list. A placement keeps its own copy, edited
  // independently — swap an ingredient on Tuesday and the two lists no longer line up, so those
  // ranges would light the wrong rows and strike through the wrong things while cooking. When the
  // lists have diverged, drop the ranges: the chart falls back to a plain stage ladder, which
  // says less but says nothing false. Re-syncing the copies instead would delete the user's edit.
  const mealRefCount = parseRefs(meal.ingredients).length
  const stagesDiverged = fromPlan && refs.length !== mealRefCount
  const stages = parseStages(meal.stages).map(s =>
    stagesDiverged ? { ...s, from: 0, to: -1 } : s,
  )
  const tags = meal.tag.split(',').map(t => t.trim()).filter(Boolean)
  const totalMinutes = meal.prepMinutes + meal.cookMinutes

  return (
    <main className="recipe-page">
      <BackLink />

      {/* Split hero: the photo keeps its own 4:3 ratio beside the naming block, instead of a
          280px band that cropped a 4:3 photo to a 4.53:1 sliver of itself. CookMode renders the
          split so Serves, Start cooking and the step bar can sit under the macros while their
          state stays where the chart and the timer already read it. */}
      <CookMode
        stages={stages}
        servings={meal.servings}
        ingredients={ingredients.map(({ ref, food }) => ({
          quantity: ref.quantity,
          unit: ref.measure || food?.baseUnit || '',
          name: food?.name ?? 'Unknown food',
        }))}
        hero={
      <div className="recipe-hero">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.title} />
        ) : (
          <div className="photo-ph">{meal.title[0]}</div>
        )}
        {tags.length > 0 && (
          <div className="meal-tags">
            {tags.map(t => <span key={t} className="meal-tag">{t}</span>)}
          </div>
        )}
      </div>
        }
        head={
          <>
      {fromPlan && <p className="page-eyebrow">Portions from your plan</p>}

      <div className="recipe-head">
        <h1 className="recipe-title">{meal.title}</h1>
        <FavoriteButton mealId={meal.id} isFavorite={meal.isFavorite} />
      </div>
      {meal.description && <p className="recipe-desc">{meal.description}</p>}

      <div className="recipe-meta">
        {meal.prepMinutes > 0 && (
          <span className="recipe-meta-item"><Icon name="clock" size={14} /> Prep {meal.prepMinutes} min</span>
        )}
        {meal.cookMinutes > 0 && (
          <span className="recipe-meta-item"><Icon name="flame" size={14} /> Cook {meal.cookMinutes} min</span>
        )}
        {totalMinutes > 0 && (
          <span className="recipe-meta-item recipe-meta-total">Total {totalMinutes} min</span>
        )}
        <span className="recipe-meta-item"><Icon name="users" size={14} /> {meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}</span>
      </div>

      <MacroRow calories={totals.calories} protein={totals.protein} carbs={totals.carbs} fats={totals.fats} />
          </>
        }
        list={
          <div className="recipe-columns">
            <section className="recipe-panel">
              <h2 className="recipe-panel-title">Ingredients</h2>
              {ingredients.length > 0 ? (
                <ul className="recipe-ingredients">
                  {ingredients.map(({ ref, food, macros }, i) => {
                    const name = food?.name ?? 'Unknown food'
                    const unit = ref.measure || food?.baseUnit || ''
                    return (
                      <li key={i}>
                        <span>{formatIngredientLine(ref.quantity, unit, name)}</span>
                        {macros.calories > 0 && (
                          <span className="recipe-ing-macros">{Math.round(macros.calories)} kcal</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="recipe-empty">No ingredients listed yet.</p>
              )}
            </section>

            <section className="recipe-panel recipe-panel-steps">
              <h2 className="recipe-panel-title">Steps</h2>
              {steps.length > 0 ? (
                <ol className="recipe-steps">
                  {steps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              ) : (
                <p className="recipe-empty">No steps listed yet.</p>
              )}
            </section>
          </div>
        }
      />
    </main>
  )
}
