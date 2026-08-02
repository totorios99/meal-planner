import { z } from 'zod'

export type RecipeView = 'chart' | 'list'
export type Units = 'US' | 'Metric'
export type ThemePref = 'system' | 'light' | 'dark'

export type Settings = {
  calories: number
  protein: number
  carbs: number
  fats: number
  recipeView: RecipeView
  units: Units
  theme: ThemePref
  plannerFullTitles: boolean
  weekStartsOn: WeekStart
}

// The JS convention: same numbering as Date#getDay().
export type WeekStart = 0 | 1

// The four macro fields on their own — the planner components analyse against these and
// have no business seeing display preferences.
export type MacroTargets = Pick<Settings, 'calories' | 'protein' | 'carbs' | 'fats'>

// Must stay in step with the column defaults in prisma/schema.prisma: these are what a
// browser renders before the server row arrives, and what a bad stored value falls back to.
// Slight surplus for muscle gain: 2440 kcal (160/270/80 = 640+1080+720).
export const DEFAULTS: Settings = {
  calories: 2450,
  protein: 160,
  carbs: 270,
  fats: 80,
  recipeView: 'chart',
  units: 'US',
  theme: 'system',
  plannerFullTitles: false,
  weekStartsOn: 1,
}

// Every field optional — the UI autosaves one control at a time, so a PATCH carries one key.
// Macros are bounded on both ends: a target of 0 divides by zero in DayAnalytics' percentages,
// and an absurd upper value silently flattens every bar to 1%.
const macro = z.coerce.number().finite().positive().max(100000)

export const settingsPatch = z.object({
  calories: macro,
  protein: macro,
  carbs: macro,
  fats: macro,
  recipeView: z.enum(['chart', 'list']),
  units: z.enum(['US', 'Metric']),
  theme: z.enum(['system', 'light', 'dark']),
  plannerFullTitles: z.boolean(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
}).partial()

export type SettingsPatch = z.infer<typeof settingsPatch>

// Narrow the DB's TEXT columns back to their unions. A value can only be off-union if it was
// written outside the API, but the whole app keys CSS and conversions off these strings.
export function coerceRow(row: Record<string, unknown>): Settings {
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback
  return {
    calories: Number(row.calories) || DEFAULTS.calories,
    protein: Number(row.protein) || DEFAULTS.protein,
    carbs: Number(row.carbs) || DEFAULTS.carbs,
    fats: Number(row.fats) || DEFAULTS.fats,
    recipeView: oneOf(row.recipeView, ['chart', 'list'] as const, DEFAULTS.recipeView),
    units: oneOf(row.units, ['US', 'Metric'] as const, DEFAULTS.units),
    theme: oneOf(row.theme, ['system', 'light', 'dark'] as const, DEFAULTS.theme),
    plannerFullTitles: Boolean(row.plannerFullTitles),
    weekStartsOn: Number(row.weekStartsOn) === 0 ? 0 : DEFAULTS.weekStartsOn,
  }
}
