import { z } from 'zod'

// A meal/placement ingredient: a reference to a food + how much of which measure.
// Macros are derived from the food (source of truth), never sent here.
export const refSchema = z.object({
  foodId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().min(0).default(0),
  measure: z.string().default(''),
})

// One cook-mode stage (see Stage in lib/recipe.ts). `to` defaults to -1, i.e. an empty
// ingredient span, so a stage authored without one renders as a plain step rather than
// claiming the first ingredient row.
export const stageSchema = z.object({
  name: z.string().trim().min(1),
  detail: z.string().trim().optional(),
  timing: z.string().default(''),
  hint: z.string().optional(),
  seconds: z.coerce.number().int().min(0).default(0),
  slot: z.coerce.number().int().min(0).default(0),
  from: z.coerce.number().int().min(0).default(0),
  to: z.coerce.number().int().min(-1).default(-1),
  meanwhile: z.boolean().optional(),
})

// Stage ranges index the ingredient array they were authored against, so they can only be checked
// against a count — a stage claiming row 12 of an 8-ingredient recipe would paint a block over rows
// nobody sent. `mealInput` deliberately stays unrefined (the meal routes call .partial(), which
// zod forbids on a refined object), so the meal routes call this themselves against the payload's
// ingredients or, for a partial update that sends stages alone, the meal's stored ones.
export function stageRangeIssues(
  stages: { name: string; from: number; to: number }[],
  ingredientCount: number
): string[] {
  const issues: string[] = []
  for (const st of stages) {
    if (st.to < st.from) continue // no ingredient span — always fine
    if (st.to >= ingredientCount) {
      issues.push(`stage "${st.name}" claims ingredient ${st.to} but only ${ingredientCount} were sent`)
    }
  }
  return issues
}

// Modal sends numeric fields as strings — coerce. Meal macro columns are the cached sum
// over the referenced foods; the route computes them (see recomputeMealCache / loadFoodsMap).
export const mealInput = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  tag: z.string().default(''),
  imageUrl: z.string().default(''),
  ingredients: z.array(refSchema).default([]),
  steps: z.array(z.string()).default([]),
  stages: z.array(stageSchema).default([]),
  prepMinutes: z.coerce.number().int().min(0).default(0),
  cookMinutes: z.coerce.number().int().min(0).default(0),
  servings: z.coerce.number().int().min(1).default(1),
})

export type MealInput = z.infer<typeof mealInput>

// ingredients/steps live in String columns as JSON — stringify at the write boundary.
// Macros are added by the route from the foods map (not here — this helper is pure/sync).
export function toMealData(input: MealInput) {
  const { ingredients, steps, stages, ...rest } = input
  return {
    ...rest,
    ingredients: JSON.stringify(ingredients),
    steps: JSON.stringify(steps),
    stages: JSON.stringify(stages),
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
  // `protocol` matters: a bare z.url() accepts ANY scheme, so `javascript:alert(1)`,
  // `data:text/html,…` and `file:///etc/passwd` all validated as "a valid URL" and were
  // written straight into the meal's imageUrl. None of them execute in an <img src>, but
  // none of them are a photo either, and the next place this string gets rendered might
  // not be an <img>. An image lives at http(s) or under /api/images/.
  image: z.union([z.url({ protocol: /^https?$/ }), z.string().regex(/^\/api\/images\//)], {
    error: 'image is required — an http(s) URL or /api/images/… path to the recipe photo',
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
  // Optional: agents that can tell which steps overlap emit these too, and the cook-mode chart
  // uses them instead of the one-stage-per-step fallback. `from`/`to` index into `ingredients`.
  stages: z.array(stageSchema).default([]),
}).superRefine((v, ctx) => {
  for (const issue of stageRangeIssues(v.stages, v.ingredients.length)) {
    ctx.addIssue({ code: 'custom', message: issue, path: ['stages'] })
  }
})

export type ImportInput = z.infer<typeof importSchema>
export type ImportIngredient = z.infer<typeof importIngredient>
