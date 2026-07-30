import { notFound } from 'next/navigation'
import { BackLink } from '@/components/BackLink'
import { prisma } from '@/lib/prisma'
import { parseList, parseRefs, parseStages, refMacros, sumRefs, foodsMap, formatIngredientLine } from '@/lib/recipe'
import { Icon } from '@/components/Icon'
import { MacroRow } from '@/components/meals/MacroRow'
import { FavoriteButton } from '@/components/meals/FavoriteButton'
import { CookMode } from '@/components/meals/CookMode'
import { RecipeBody } from '@/components/meals/RecipeBody'

export const dynamic = 'force-dynamic'

export default async function MealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pm?: string }>
}) {
  const { id } = await params
  const { pm } = await searchParams
  const mealId = Number(id)
  if (!Number.isInteger(mealId)) notFound()

  const meal = await prisma.meal.findUnique({ where: { id: mealId } })
  if (!meal) notFound()

  // ?pm=<WeeklyPlanMeal.id> renders this recipe with that placement's edited portions
  const planMealId = Number(pm)
  const placement = Number.isInteger(planMealId)
    ? await prisma.weeklyPlanMeal.findUnique({ where: { id: planMealId } })
    : null
  const fromPlan = placement?.mealId === meal.id
  const refs = parseRefs(fromPlan ? placement!.ingredients : meal.ingredients)

  const fmap = foodsMap(await prisma.food.findMany())
  const ingredients = refs.map(ref => {
    const food = fmap.get(ref.foodId)
    return { ref, food, macros: refMacros(ref, food) }
  })
  const totals = fromPlan ? sumRefs(refs, fmap) : meal
  const steps = parseList(meal.steps)
  const stages = parseStages(meal.stages)
  const tags = meal.tag.split(',').map(t => t.trim()).filter(Boolean)
  const totalMinutes = meal.prepMinutes + meal.cookMinutes

  return (
    <main className="recipe-page">
      <BackLink />

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

      <RecipeBody
        chart={
          <CookMode
            stages={stages}
            servings={meal.servings}
            ingredients={ingredients.map(({ ref, food }) => ({
              quantity: ref.quantity,
              unit: ref.measure || food?.baseUnit || '',
              name: food?.name ?? 'Unknown food',
            }))}
          />
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
