import { z } from 'zod'
import { slugify } from '@/lib/slugify'
import { CANONICAL_NUTRIENTS } from '@/lib/recipe'

export const measureInput = z.object({
  unit: z.string().trim().min(1),
  perBase: z.coerce.number().positive(),
})

// One nutrient fact, per 1 baseUnit. key is auto-derived from label when omitted, so a human
// (FoodModal) or an agent (upsert_food) writing just a label still converges on the same key.
export const nutrientEntryInput = z
  .object({
    key: z.string().trim().optional(),
    label: z.string().trim().min(1, 'Label is required'),
    unit: z.string().trim().default(''),
    amount: z.coerce.number().min(0).default(0),
    group: z.enum(['macro', 'micro', 'other']).default('other'),
  })
  .transform(n => ({ ...n, key: n.key && n.key.length > 0 ? n.key : slugify(n.label) }))

// A food is the source of truth for one ingredient's nutrients (per 1 baseUnit), sparse/dynamic
// — no fixed macro fields. Reject duplicate keys within one food at write time (read-time
// merging across foods can't distinguish "duplicate" from "two different foods agree").
// Capitalize just the first character — food names are free text, not title-cased ("Kirkland
// Signature Almond Butter" keeps its own casing), so only the leading letter is normalized.
function capitalizeFirst(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

export const foodInput = z.object({
  name: z.string().trim().min(1, 'Name is required').transform(capitalizeFirst),
  baseUnit: z.string().trim().default(''),
  imageUrl: z.string().trim().default(''),
  isPlaceholder: z.boolean().default(false),
  nutrients: z.array(nutrientEntryInput).default([]).superRefine((arr, ctx) => {
    const seen = new Set<string>()
    for (const n of arr) {
      // A label made entirely of non-alphanumeric characters (e.g. "%", "---") slugifies to
      // '' — reject it here rather than saving a key that parseNutrients would silently drop
      // later. Note "%DV" is NOT such a label: it keys as `dv`, since D and V survive.
      if (!n.key) {
        ctx.addIssue({ code: 'custom', message: `"${n.label}" needs at least one letter or number` })
      } else if (seen.has(n.key)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate nutrient key: ${n.key}` })
      }
      seen.add(n.key)
    }
  }),
  measures: z.array(measureInput).default([]),
})

export type FoodInput = z.infer<typeof foodInput>

// Non-blocking heads-up when a saved food is missing a canonical key — surfaced through the
// API response (and from there, upsert_food's tool result) so an authoring agent notices a
// silent 0 before it shows up on a meal card, instead of never.
export function canonicalWarnings(nutrients: FoodInput['nutrients']): string[] {
  const keys = new Set(nutrients.map(n => n.key))
  return CANONICAL_NUTRIENTS.filter(c => !keys.has(c.key)).map(c => `missing canonical key: ${c.key}`)
}

// nutrients/measures live in String columns as JSON — stringify at the write boundary
export function toFoodData(input: FoodInput) {
  const { measures, nutrients, ...rest } = input
  return { ...rest, measures: JSON.stringify(measures), nutrients: JSON.stringify(nutrients) }
}

// Shape a DB food row for the API (parse measures/nutrients JSON to arrays)
export function foodToJson(food: { measures: string; nutrients: string } & Record<string, unknown>) {
  const { measures, nutrients, ...rest } = food
  const parse = (s: string) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }
  return { ...rest, measures: parse(measures), nutrients: parse(nutrients) }
}
