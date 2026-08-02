'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useSettings } from '@/lib/SettingsContext'
import type { RecipeView as View } from '@/lib/settings'

// Cook/List switch for the meal page body — "Cook" is the stage chart on a desktop and the same
// stages as cards on a phone, "List" is the plain ingredients + steps. Both views arrive as already-rendered nodes and both
// stay in the DOM: which one shows is decided by `data-recipe-view` on <html>, stamped by the
// server render in app/layout.tsx from the saved default. Swapping in an effect instead would
// flash the chart at everyone who prefers the list, on every navigation.
export function RecipeBody({ chart, list }: { chart: ReactNode; list: ReactNode }) {
  // Session-local, seeded from the saved default. Flipping to List to read one recipe used to
  // rewrite that default for every recipe forever; the default is edited in /settings now.
  // Remounting on navigation re-seeds, so each recipe opens the way you actually prefer.
  const { settings } = useSettings()
  const [view, setView] = useState(settings.recipeView)

  // The attribute (not React state) is what shows a view, so it has to follow `view` — written
  // in an effect because it mutates the document outside React's tree.
  useEffect(() => {
    document.documentElement.dataset.recipeView = view
  }, [view])

  // Chart and list are the same recipe in two shapes, and they differ wildly in height — swapped
  // by `display`, the page jumps and you lose your place. A view transition morphs the body
  // container between the two sizes and crossfades the contents instead. flushSync is what makes
  // it work: startViewTransition snapshots after its callback returns, so the `display` swap (done
  // by the effect above, off `view`) has to have already landed synchronously. Browsers without
  // the API just take the instant swap, which is the old behaviour.
  function pick(next: View) {
    const swap = () => flushSync(() => setView(next))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !document.startViewTransition) swap()
    else document.startViewTransition(swap)
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
