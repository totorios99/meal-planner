import { z } from 'zod'

export const measureInput = z.object({
  unit: z.string().trim().min(1),
  perBase: z.coerce.number().positive(),
})

// A food is the source of truth for one ingredient's macros (per 1 baseUnit).
export const foodInput = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  baseUnit: z.string().trim().default(''),
  calories: z.coerce.number().min(0).default(0),
  protein: z.coerce.number().min(0).default(0),
  carbs: z.coerce.number().min(0).default(0),
  fats: z.coerce.number().min(0).default(0),
  measures: z.array(measureInput).default([]),
})

export type FoodInput = z.infer<typeof foodInput>

// measures live in a String column as JSON — stringify at the write boundary
export function toFoodData(input: FoodInput) {
  const { measures, ...rest } = input
  return { ...rest, measures: JSON.stringify(measures) }
}

// Shape a DB food row for the API (parse measures JSON to an array)
export function foodToJson(food: { measures: string } & Record<string, unknown>) {
  const { measures, ...rest } = food
  let parsed: unknown = []
  try { parsed = JSON.parse(measures) } catch { parsed = [] }
  return { ...rest, measures: Array.isArray(parsed) ? parsed : [] }
}
