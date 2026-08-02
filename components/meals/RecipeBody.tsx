import type { ReactNode } from 'react'

// Cook/List body for the meal page — "Cook" is the stage chart on a desktop and the same stages as
// cards on a phone, "List" is the plain ingredients + steps. Both stay in the DOM: which one shows
// is decided by `data-recipe-view` on <html>, stamped by the server render in app/layout.tsx and
// re-applied by stamp() in lib/SettingsContext. The choice lives only in /settings — there is no
// in-flow switch.
export function RecipeBody({ chart, list }: { chart: ReactNode; list: ReactNode }) {
  return (
    <>
      <div className="recipe-view-chart">{chart}</div>
      <div className="recipe-view-list">{list}</div>
    </>
  )
}
