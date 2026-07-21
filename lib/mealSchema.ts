import { z } from 'zod'
import { sumIngredients, type Ingredient } from '@/lib/recipe'

// A structured ingredient line-item. Macros are absolute for the current quantity.
export const ingredientSchema = z.object({
  name: z.string().default(''),
  quantity: z.coerce.number().min(0).default(0),
  unit: z.string().default(''),
  calories: z.coerce.number().min(0).default(0),
  protein: z.coerce.number().min(0).default(0),
  carbs: z.coerce.number().min(0).default(0),
  fats: z.coerce.number().min(0).default(0),
})

// Modal sends numeric fields as strings — coerce. Meal macros are DERIVED from
// ingredients (see toMealData), so the four macro fields here are ignored on write.
export const mealInput = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  tag: z.string().default(''),
  imageUrl: z.string().default(''),
  ingredients: z.array(ingredientSchema).default([]),
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
  // Absolute URL, or a path from POST /api/images (stable local copy — preferred for video frames)
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
  // Per-ingredient macros are optional — agents extracting from video/photo often
  // can't derive them reliably. A plain string is accepted too. Missing macros fall
  // back to a lump built from the top-level totals (see importToMealData).
  ingredients: z.array(z.union([z.string(), ingredientSchema])).min(1),
  steps: z.array(z.string()).min(1),
})

export type ImportInput = z.infer<typeof importSchema>

// Normalize import ingredients (strings or partial objects) to Ingredient[], and
// return the cached macro totals. If ingredients carry no macros, spread the caller's
// totals evenly across the rows (a placeholder split the user refines later).
function normalizeImportIngredients(
  raw: ImportInput['ingredients'],
  totals: { calories: number; protein: number; carbs: number; fats: number },
): { ingredients: Ingredient[]; totals: typeof totals } {
  const items: Ingredient[] = raw.map(i =>
    typeof i === 'string'
      ? { name: i, quantity: 1, unit: '', calories: 0, protein: 0, carbs: 0, fats: 0 }
      : i,
  )
  const summed = sumIngredients(items)
  const hasMacros = summed.calories || summed.protein || summed.carbs || summed.fats
  if (hasMacros) return { ingredients: items, totals: summed }
  const n = items.length || 1
  const split = items.map(i => ({
    ...i,
    calories: totals.calories / n, protein: totals.protein / n,
    carbs: totals.carbs / n, fats: totals.fats / n,
  }))
  return { ingredients: split, totals: sumIngredients(split) }
}

export function importToMealData(input: ImportInput) {
  const { name, image, categories, tags, ingredients, steps, calories, protein, carbs, fats, ...rest } = input
  const norm = normalizeImportIngredients(ingredients, { calories, protein, carbs, fats })
  return {
    ...rest,
    ...norm.totals,
    title: name,
    imageUrl: image,
    tag: [...categories, ...tags].join(', '),
    ingredients: JSON.stringify(norm.ingredients),
    steps: JSON.stringify(steps),
  }
}

// Meal macros are DERIVED from ingredients — recompute the cached totals on write.
// ingredients/steps live in String columns as JSON — stringify at the write boundary.
export function toMealData(input: MealInput) {
  return {
    ...input,
    ...sumIngredients(input.ingredients),
    ingredients: JSON.stringify(input.ingredients),
    steps: JSON.stringify(input.steps),
  }
}
