export type Meal = {
  id: number
  title: string
  description: string
  calories: number
  protein: number
  carbs: number
  fats: number
  imageUrl: string
  createdAt: string
  updatedAt: string
}

export type WeeklyPlanMeal = {
  id: number
  weeklyPlanDayId: number
  mealId: number
  meal: Meal
  slotIndex: number
  portionMultiplier: number
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
