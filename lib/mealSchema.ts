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

// Shape external agents send to POST /api/meals/import (see mcp/extraction-prompt.md)
export const importSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(''),
  image: z.url({ error: 'image is required — a valid URL to the recipe photo' }),
  servings: z.number().int().min(1).default(1),
  prepMinutes: z.number().int().min(0).default(0),
  cookMinutes: z.number().int().min(0).default(0),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  categories: z.array(z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack'])).default([]),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).min(1),
  steps: z.array(z.string()).min(1),
})

export type ImportInput = z.infer<typeof importSchema>

export function importToMealData(input: ImportInput) {
  const { name, image, categories, tags, ingredients, steps, ...rest } = input
  return {
    ...rest,
    title: name,
    imageUrl: image,
    tag: [...categories, ...tags].join(', '),
    ingredients: JSON.stringify(ingredients),
    steps: JSON.stringify(steps),
  }
}

// ingredients/steps live in String columns as JSON — stringify at the write boundary
export function toMealData(input: MealInput) {
  return {
    ...input,
    ingredients: JSON.stringify(input.ingredients),
    steps: JSON.stringify(input.steps),
  }
}
