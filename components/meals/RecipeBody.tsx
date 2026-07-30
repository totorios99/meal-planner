'use client'
import { useEffect, useState, type ReactNode } from 'react'

const VIEW_KEY = 'meal-planner-recipe-view'
type View = 'chart' | 'list'

// Cook/List switch for the meal page body — "Cook" is the stage chart on a desktop and the same
// stages as cards on a phone, "List" is the plain ingredients + steps. Both views arrive as already-rendered nodes and both
// stay in the DOM: which one shows is decided by `data-recipe-view` on <html>, stamped before
// first paint by the inline script in app/layout.tsx. Swapping in an effect instead would flash
// the chart at everyone who prefers the list, on every navigation.
export function RecipeBody({ chart, list }: { chart: ReactNode; list: ReactNode }) {
  const [view, setView] = useState<View>('chart')

  // Mirrors the attribute into state purely so the toggle can render its own pressed state; the
  // content above never waits on it.
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_KEY)
    if (stored === 'chart' || stored === 'list') setView(stored)
  }, [])

  // The attribute (not React state) is what shows a view, so it has to follow `view` — written
  // in an effect because it mutates the document outside React's tree.
  useEffect(() => {
    document.documentElement.dataset.recipeView = view
  }, [view])

  function pick(next: View) {
    setView(next)
    localStorage.setItem(VIEW_KEY, next)
  }

  return (
    <>
      <div className="cook-viewswitch">
        <div className="cook-seg-pills" role="radiogroup" aria-label="Recipe layout">
          {(['chart', 'list'] as View[]).map(v => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === view}
              className={`cook-seg${v === view ? ' is-on' : ''}`}
              onClick={() => pick(v)}
            >
              {v === 'chart' ? 'Cook' : 'List'}
            </button>
          ))}
        </div>
      </div>
      <div className="recipe-view-chart">{chart}</div>
      <div className="recipe-view-list">{list}</div>
    </>
  )
}
