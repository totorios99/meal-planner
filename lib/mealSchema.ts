import { z } from 'zod'

// A meal/placement ingredient: a reference to a food + how much of which measure.
// Macros are derived from the food (source of truth), never sent here.
export const refSchema = z.object({
  foodId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().min(0).default(0),
  measure: z.string().default(''),
})

// Modal sends numeric fields as strings — coerce. Meal macro columns are the cached sum
// over the referenced foods; the route computes them (see recomputeMealCache / loadFoodsMap).
export const mealInput = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  tag: z.string().default(''),
  imageUrl: z.string().default(''),
  ingredients: z.array(refSchema).default([]),
  steps: z.array(z.string()).default([]),
  prepMinutes: z.coerce.number().int().min(0).default(0),
  cookMinutes: z.coerce.number().int().min(0).default(0),
  servings: z.coerce.number().int().min(1).default(1),
})

export type MealInput = z.infer<typeof mealInput>

// ingredients/steps live in String columns as JSON — stringify at the write boundary.
// Macros are added by the route from the foods map (not here — this helper is pure/sync).
export function toMealData(input: MealInput) {
  const { ingredients, steps, ...rest } = input
  return {
    ...rest,
    ingredients: JSON.stringify(ingredients),
    steps: JSON.stringify(steps),
  }
}

// Shape external agents send to POST /api/meals/import (see mcp/extraction-prompt.md).
// Ingredients are name-based (agents don't know foodIds); the import route upserts foods
// and builds refs. Per-ingredient macros optional; missing ones even-split the top totals.
export const importIngredient = z.object({
  name: z.string().trim().min(1),
  unit: z.string().default(''),
  quantity: z.coerce.number().min(0).default(1),
  calories: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fats: z.coerce.number().min(0).optional(),
})

export const importSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(''),
  image: z.union([z.url(), z.string().regex(/^\/api\/images\//)], {
    error: 'image is required — a valid URL or /api/images/… path to the recipe photo',
  }),
  servings: z.number().int().min(1).default(1),
  prepMinutes: z.number().int().min(0).default(0),
  cookMinutes: z.number().int().min(0).default(0),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  categories: z.array(z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack'])).default([]),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.union([z.string(), importIngredient])).min(1),
  steps: z.array(z.string()).min(1),
})

export type ImportInput = z.infer<typeof importSchema>
export type ImportIngredient = z.infer<typeof importIngredient>
