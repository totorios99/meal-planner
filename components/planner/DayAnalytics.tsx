import { MacroBar } from './MacroBar'
import { MacroPie } from './MacroPie'
import { MacroTargets } from '@/lib/useMacroTargets'

interface Totals {
  calories: number
  protein: number
  carbs: number
  fats: number
}

interface Props {
  totals: Totals
  targets: MacroTargets
}

export function DayAnalytics({ totals, targets }: Props) {
  return (
    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-700 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <MacroBar label="Cal" value={totals.calories} target={targets.calories} color="bg-purple-500" unit=" kcal" />
          <MacroBar label="Protein" value={totals.protein} target={targets.protein} color="bg-blue-500" />
          <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} color="bg-emerald-500" />
          <MacroBar label="Fats" value={totals.fats} target={targets.fats} color="bg-amber-500" />
        </div>
        <MacroPie protein={totals.protein} carbs={totals.carbs} fats={totals.fats} />
      </div>
    </div>
  )
}
