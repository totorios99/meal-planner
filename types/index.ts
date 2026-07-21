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

// Food row as returned by /api/foods (measures already parsed to an array).
export type FoodRow = {
  id: number
  name: string
  baseUnit: string
  calories: number
  protein: number
  carbs: number
  fats: number
  measures: { unit: string; perBase: number }[]
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
