import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { parseList } from '@/lib/recipe'
import { Icon } from '@/components/Icon'
import { MacroRow } from '@/components/meals/MacroRow'
import { FavoriteButton } from '@/components/meals/FavoriteButton'

export const dynamic = 'force-dynamic'

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mealId = Number(id)
  if (!Number.isInteger(mealId)) notFound()

  const meal = await prisma.meal.findUnique({ where: { id: mealId } })
  if (!meal) notFound()

  const ingredients = parseList(meal.ingredients)
  const steps = parseList(meal.steps)
  const tags = meal.tag.split(',').map(t => t.trim()).filter(Boolean)
  const totalMinutes = meal.prepMinutes + meal.cookMinutes

  return (
    <main className="recipe-page">
      <Link href="/meals" className="recipe-back">
        <Icon name="chev-left" size={15} /> Cookbook
      </Link>

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

      <MacroRow calories={meal.calories} protein={meal.protein} carbs={meal.carbs} fats={meal.fats} />

      <div className="recipe-columns">
        <section className="recipe-panel">
          <h2 className="recipe-panel-title">Ingredients</h2>
          {ingredients.length > 0 ? (
            <ul className="recipe-ingredients">
              {ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
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
    </main>
  )
}
