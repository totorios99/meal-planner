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
  ingredients: string // JSON-encoded Ingredient[] — use parseIngredients(); macros above are the cached sum
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
  ingredients: string // JSON-encoded Ingredient[] — per-placement snapshot, use parseIngredients()
}

// Personal ingredient library row (macros per 1 unit)
export type LibraryIngredient = {
  id: number
  name: string
  unit: string
  calories: number
  protein: number
  carbs: number
  fats: number
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
