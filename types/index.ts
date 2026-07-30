export type Meal = {
  id: number
  title: string
  description: string
  tag: string
  calories: number
  protein: number
  carbs: number
  fats: number
  imageUrl: string
  ingredients: string // JSON-encoded IngredientRef[] — use parseRefs(); macros above are the cached sum over foods
  steps: string // JSON-encoded string[] — use parseList()
  stages: string // JSON-encoded Stage[] — use parseStages(); cook-mode chart, backfilled from steps
  prepMinutes: number
  cookMinutes: number
  servings: number
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export type WeeklyPlanMeal = {
  id: number
  weeklyPlanDayId: number
  mealId: number
  meal: Meal
  slotIndex: number
  ingredients: string // JSON-encoded IngredientRef[] — per-placement, use parseRefs()
}

// Food row as returned by /api/foods (measures/nutrients already parsed to arrays).
export type FoodRow = {
  id: number
  name: string
  baseUnit: string
  imageUrl: string
  isPlaceholder: boolean
  nutrients: { key: string; label: string; unit: string; amount: number; group?: 'macro' | 'micro' | 'other' }[]
  measures: { unit: string; perBase: number }[]
  warnings?: string[]
}

export type WeeklyPlanDay = {
  id: number
  weeklyPlanId: number
  dayIndex: number  // 0=Mon, 6=Sun
  isDismissed: boolean
  justification: string
  meals: WeeklyPlanMeal[]
}

export type WeeklyPlan = {
  id: number
  weekStart: string
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  days: WeeklyPlanDay[]
}
