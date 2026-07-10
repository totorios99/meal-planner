import { z } from 'zod'

// Modal sends numeric fields as strings — coerce.
export const mealInput = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  tag: z.string().default(''),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fats: z.coerce.number().min(0),
  imageUrl: z.string().default(''),
  ingredients: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  prepMinutes: z.coerce.number().int().min(0).default(0),
  cookMinutes: z.coerce.number().int().min(0).default(0),
  servings: z.coerce.number().int().min(1).default(1),
})

export type MealInput = z.infer<typeof mealInput>

// ingredients/steps live in String columns as JSON — stringify at the write boundary
export function toMealData(input: MealInput) {
  return {
    ...input,
    ingredients: JSON.stringify(input.ingredients),
    steps: JSON.stringify(input.steps),
  }
}
