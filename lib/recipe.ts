// steps are stored as JSON-encoded string[] columns (SQLite)
export function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export type Macros = { calories: number; protein: number; carbs: number; fats: number }

// A measure a food can be counted in. perBase = base units in 1 of this measure
// (e.g. rice base "g", measure {unit:"cup", perBase:185}).
export type Measure = { unit: string; perBase: number }

// One nutrient fact, per 1 baseUnit. key is the machine identifier (see CORE_MACRO_KEYS for
// the 4 reserved ones); group is cosmetic, for clustering in the UI only.
export type NutrientEntry = {
  key: string
  label: string
  unit: string
  amount: number
  group?: 'macro' | 'micro' | 'other'
}

// The 4 macros every meal card / day total / print page relies on. Any Food is expected to
// carry these keys if it should contribute visibly to those (see mcp/server.mjs upsert_food).
export const CORE_MACRO_KEYS = {
  calories: 'calories',
  protein: 'protein_g',
  carbs: 'carbs_g',
  fats: 'fat_g',
} as const

// Single source of truth for the 4 canonical entries (key/label/unit) — foodSchema.ts's
// canonicalWarnings and FoodModal.tsx's pre-seeded rows both derive from this instead of
// hand-copying the same 4 strings a second/third time.
export const CANONICAL_NUTRIENTS: { key: string; label: string; unit: string }[] = [
  { key: CORE_MACRO_KEYS.calories, label: 'Calories', unit: 'kcal' },
  { key: CORE_MACRO_KEYS.protein, label: 'Protein', unit: 'g' },
  { key: CORE_MACRO_KEYS.carbs, label: 'Carbs', unit: 'g' },
  { key: CORE_MACRO_KEYS.fats, label: 'Fat', unit: 'g' },
]

// Food source of truth. Nutrients are sparse/dynamic, per 1 baseUnit.
export type Food = {
  id: number
  name: string
  baseUnit: string
  nutrients: NutrientEntry[]
  measures: Measure[]
  isPlaceholder: boolean
}

// A meal/placement line-item: references a food + how much of which measure.
export type IngredientRef = { foodId: number; quantity: number; measure: string }

// Weight/volume units are continuous — showing "5.2 kcal / 1 g" reads as noise. Prefer whatever
// discrete real-world unit a food actually has (egg, cookie, banana, 1/3 avocado…), falling back
// to per-100-base only when no such unit exists. Purely a display choice — callers still store
// and edit nutrients per 1 baseUnit; this only picks what multiple of that to present.
const WEIGHT_VOLUME_UNITS = new Set([
  'g', 'kg', 'mg', 'ml', 'l', 'oz', 'lb', 'floz', 'fl oz',
  'cup', 'cups', 'tbsp', 'tablespoon', 'tsp', 'teaspoon',
])

export function pieceMeasure(baseUnit: string, measures: Measure[]): { factor: number; label: string; display: string } {
  const base = (baseUnit || '').trim().toLowerCase()
  if (base && !WEIGHT_VOLUME_UNITS.has(base)) return { factor: 1, label: baseUnit, display: baseUnit }
  const piece = measures.find(m => !WEIGHT_VOLUME_UNITS.has(m.unit.trim().toLowerCase()))
  // A named piece measure (banana, cookie, portion…) doesn't say its own size, unlike a bare
  // baseUnit (egg) or the 100-fallback (which spells "100g" outright) — so spell out its amount.
  if (piece) return { factor: piece.perBase, label: piece.unit, display: `${piece.perBase} ${baseUnit} ${piece.unit}` }
  const label = `100${baseUnit || 'g'}`
  return { factor: 100, label, display: label }
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function parseMeasures(s: string): Measure[] {
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v
      .map(m => ({ unit: String(m?.unit ?? '').trim(), perBase: num(m?.perBase) }))
      .filter(m => m.unit && m.perBase > 0)
  } catch {
    return []
  }
}

// nutrients live in a String column as JSON — parse with a shape-guard, [] on failure.
export function parseNutrients(s: string): NutrientEntry[] {
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v
      .map(n => ({
        key: String(n?.key ?? '').trim(),
        label: String(n?.label ?? '').trim(),
        unit: String(n?.unit ?? '').trim(),
        amount: num(n?.amount),
        group: (n?.group === 'macro' || n?.group === 'micro' || n?.group === 'other') ? n.group : 'other',
      }))
      .filter(n => n.key)
  } catch {
    return []
  }
}

// ingredients live in a String column as JSON refs — parse with a shape-guard, [] on failure
export function parseRefs(s: string): IngredientRef[] {
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map(r => ({
      foodId: num(r?.foodId),
      quantity: num(r?.quantity),
      measure: String(r?.measure ?? ''),
    })).filter(r => r.foodId >= 0)
  } catch {
    return []
  }
}

// One cooking stage of the cook-mode chart. `slot` is the time slot: stages sharing a slot run
// in parallel, and the slot's timer is max(seconds) across them. `from`/`to` is the inclusive
// ingredient index range the stage consumes — from > to (e.g. to: -1) means "no ingredients",
// which is how step-backfilled meals degenerate to a plain ladder. Grid geometry is always
// derived (row = from+1 / to+2, column = slot+2), never stored.
export type Stage = {
  name: string
  detail?: string
  timing: string
  hint?: string
  seconds: number
  slot: number
  from: number
  to: number
  meanwhile?: boolean
}

// stages live in a String column as JSON — same shape-guard treatment as parseRefs, [] on
// failure. A stage with no name is dropped: it would render an unlabelled block nobody can act
// on. Indices are floored/clamped here so downstream grid math never sees a fractional row.
export function parseStages(s: string): Stage[] {
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map(st => ({
      name: String(st?.name ?? '').trim(),
      detail: String(st?.detail ?? '').trim() || undefined,
      timing: String(st?.timing ?? ''),
      hint: st?.hint ? String(st.hint) : undefined,
      seconds: Math.max(0, Math.round(num(st?.seconds))),
      slot: Math.max(0, Math.floor(num(st?.slot))),
      from: Math.max(0, Math.floor(num(st?.from))),
      // Missing `to` means no ingredient span, not row 0 — num() would give 0 and paint a block
      // over the first ingredient.
      to: typeof st?.to === 'number' ? Math.floor(st.to) : -1,
      meanwhile: st?.meanwhile === true || undefined,
    })).filter(st => st.name)
  } catch {
    return []
  }
}

// Time slots the chart has: slots are 0-based and dense enough that the highest one defines the
// column count (an unused middle slot just renders an empty column).
export function slotCount(stages: Stage[]): number {
  return stages.length ? Math.max(...stages.map(s => s.slot)) + 1 : 0
}

// The slot's countdown is the LONGEST stage in it — a parallel `meanwhile` stage must not cut
// the slot short, and a slot of only untimed stages gets 0 ("no timer").
export function slotSeconds(stages: Stage[], slot: number): number {
  return Math.max(0, ...stages.filter(s => s.slot === slot).map(s => s.seconds))
}

// The slot an ingredient goes in: the FIRST one that consumes it. Stage ranges may overlap (an
// ingredient added in one stage and crushed in the next), and the earliest use is when it enters
// the pot. -1 = no stage claims it.
export function slotOfIngredient(stages: Stage[], index: number): number {
  let owner = -1
  for (const s of stages) {
    if (s.to < s.from || index < s.from || index > s.to) continue
    if (owner === -1 || s.slot < owner) owner = s.slot
  }
  return owner
}

// A stage card is a chart cell a few words wide; the full instruction belongs behind hover/focus.
// This derives the card label from an instruction: the part before a leading "Label: …" colon when
// there is one, else the first clause, else a word-boundary truncation.
const LABEL_MAX = 46
export function stageLabel(instruction: string): string {
  const text = instruction.trim()
  if (text.length <= LABEL_MAX) return text

  const colon = text.indexOf(':')
  if (colon > 0 && colon <= LABEL_MAX) return text.slice(0, colon).trim()

  const clause = text.search(/[,.;—]/)
  if (clause > 0 && clause <= LABEL_MAX) return text.slice(0, clause).trim()

  const cut = text.lastIndexOf(' ', LABEL_MAX)
  return `${text.slice(0, cut > 0 ? cut : LABEL_MAX).trim()}…`
}

// Authoring format for the stages textarea in MealModal, one stage per line:
//
//   Soften the onion | 5–6 min | 330s | slot 0 | ing 0-1 | medium-high
//   Warm the pita | | 0s | slot 3 | ing 13 | meanwhile
//
// Only the name is required. Field 1 is the display timing; every later field is matched by
// keyword rather than position (`330s`, `slot 0`, `ing 0-1`, `meanwhile`, `> full instruction`),
// so the author can drop or reorder the ones they don't need — anything else becomes the hint.
export function parseStageLines(text: string): Stage[] {
  return text.split('\n').map(line => {
    const [rawName, rawTiming, ...rest] = line.split('|').map(s => s.trim())
    const stage: Stage = {
      name: rawName ?? '',
      timing: rawTiming ?? '',
      seconds: 0,
      slot: 0,
      from: 0,
      to: -1,
    }
    for (const field of rest) {
      if (!field) continue
      const secs = /^(\d+)\s*s$/i.exec(field)
      const slot = /^slot\s+(\d+)$/i.exec(field)
      const ing = /^ing\s+(\d+)(?:\s*-\s*(\d+))?$/i.exec(field)
      if (field.startsWith('>')) stage.detail = field.slice(1).trim() || undefined
      else if (secs) stage.seconds = Number(secs[1])
      else if (slot) stage.slot = Number(slot[1])
      else if (ing) {
        stage.from = Number(ing[1])
        stage.to = ing[2] === undefined ? Number(ing[1]) : Number(ing[2])
      } else if (/^meanwhile$/i.test(field)) stage.meanwhile = true
      else stage.hint = field
    }
    return stage
  }).filter(st => st.name)
}

// Inverse of parseStageLines, for seeding the textarea from a saved meal. Empty fields are kept
// as `| |` so the timing column stays in the position the parser expects.
export function stageLines(stages: Stage[]): string {
  return stages.map(st => {
    const parts = [st.name, st.timing, `${st.seconds}s`, `slot ${st.slot}`]
    if (st.to >= st.from) parts.push(st.from === st.to ? `ing ${st.from}` : `ing ${st.from}-${st.to}`)
    if (st.hint) parts.push(st.hint)
    if (st.meanwhile) parts.push('meanwhile')
    if (st.detail) parts.push(`> ${st.detail}`)
    return parts.join(' | ')
  }).join('\n')
}

// Weight/volume conversions for the US/Metric toggle, as metric-per-US-unit ratios. Count and
// informal units (piece, can, clove, pinch, egg…) have no metric equivalent and pass through
// untouched — this is display only, macro math always uses the stored ref.
const US_TO_METRIC: Record<string, { unit: string; factor: number }> = {
  oz: { unit: 'g', factor: 28.3495 },
  lb: { unit: 'g', factor: 453.592 },
  cup: { unit: 'ml', factor: 236.588 },
  tbsp: { unit: 'ml', factor: 14.7868 },
  tsp: { unit: 'ml', factor: 4.92892 },
  'fl oz': { unit: 'ml', factor: 29.5735 },
  qt: { unit: 'l', factor: 0.946353 },
}
// Not the inverse table: going metric→US collapses cup/tbsp/tsp/fl oz into one choice per
// metric unit (grams read as oz, millilitres as fl oz), since there's no way to recover which
// spoon the author meant.
const METRIC_TO_US: Record<string, { unit: string; factor: number }> = {
  g: { unit: 'oz', factor: 1 / 28.3495 },
  kg: { unit: 'lb', factor: 2.20462 },
  mg: { unit: 'oz', factor: 1 / 28349.5 },
  ml: { unit: 'fl oz', factor: 1 / 29.5735 },
  l: { unit: 'qt', factor: 1.05669 },
}

// Same amount expressed in the other measurement system. Unknown/count units are returned
// unchanged (with their original unit string), so callers can convert unconditionally.
export function convertUnit(
  quantity: number,
  unit: string,
  system: 'US' | 'Metric'
): { quantity: number; unit: string } {
  const u = unit.trim().toLowerCase()
  const table = system === 'Metric' ? US_TO_METRIC : METRIC_TO_US
  const hit = table[u]
  return hit ? { quantity: quantity * hit.factor, unit: hit.unit } : { quantity, unit }
}

// Base units in 1 of `measure`. Base unit (or unknown measure) → 1.
export function measureFactor(food: Food, measure: string): number {
  if (!measure || measure === food.baseUnit) return 1
  const m = food.measures.find(x => x.unit === measure)
  return m ? m.perBase : 1
}

// Cooking fractions worth snapping a decimal quantity to for display — order doesn't matter,
// closest match wins. Tolerance keeps e.g. 0.33333 (1/3 cup) and 0.34 (rounding drift) both
// reading as "1/3" without also swallowing genuinely different quantities.
const NICE_FRACTIONS: [number, string][] = [
  [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'],
  [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8'],
]
const FRACTION_TOLERANCE = 0.02

// True metric/imperial precision units — nobody measures "1/3 g", so these always render as
// plain decimals. Everything else (count units like "egg", spoon/cup units, informal ones like
// "pinch") is a natural-language quantity where a cooking fraction reads better than a decimal.
const DECIMAL_ONLY_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'l', 'oz', 'lb'])

// Quantity as shown to a user: plain rounded decimal for weight/volume units, snapped to the
// nearest common cooking fraction (whole + fraction, e.g. "1 1/2") for everything else when
// close enough, else a rounded decimal fallback. Never touches the stored ref.quantity — display
// only, macro math always uses the raw number.
export function formatQuantity(q: number, unit: string): string {
  if (!(q > 0)) return '0'
  const round2 = Math.round(q * 100) / 100
  if (DECIMAL_ONLY_UNITS.has(unit.trim().toLowerCase())) return String(round2)

  const whole = Math.floor(q)
  const frac = q - whole
  if (frac < FRACTION_TOLERANCE) return String(whole)
  for (const [value, label] of NICE_FRACTIONS) {
    if (Math.abs(frac - value) < FRACTION_TOLERANCE) {
      return whole > 0 ? `${whole} ${label}` : label
    }
  }
  return String(round2) // no nice fraction close enough — fall back to a decimal
}

// Formatted quantity + unit, omitting the unit when it just repeats the food's own name
// ("1/2 egg" for food "Egg" would be redundant next to the name — caller drops it).
export function formatQuantityWithUnit(quantity: number, unit: string, foodName: string): string {
  const qty = formatQuantity(quantity, unit)
  const u = unit.trim().toLowerCase()
  const n = foodName.trim().toLowerCase()
  // The unit is redundant when the food name already ends in it — either as the whole name
  // ("egg" for Egg) or as its last word ("cookie" for Oreo cookie, "tortilla" for Corn
  // tortilla, "leaf" for Bay leaf), which otherwise printed "5 cookie Oreo cookie".
  const redundant = !!u && (n === u || n.endsWith(` ${u}`) || n.endsWith(` ${u}s`))
  return redundant || !u ? qty : `${qty} ${unit}`
}

// One ingredient line's full display text: quantity + unit + food name in one string, for
// call sites that render it as a single span rather than separate qty/name columns.
export function formatIngredientLine(quantity: number, unit: string, foodName: string): string {
  return `${formatQuantityWithUnit(quantity, unit, foodName)} ${foodName}`
}

// Nutrients contributed by one ref, given its food — every entry's amount scaled by the
// Scale Factor rule (quantity * measureFactor), applied generically instead of per-field.
export function refNutrients(ref: IngredientRef, food: Food | undefined): NutrientEntry[] {
  // A placeholder (e.g. "vegetables") is a stand-in for whatever the user hasn't picked yet —
  // it contributes nothing to macros regardless of quantity, rather than counting a made-up
  // gram amount as if it were real data.
  if (!food || food.isPlaceholder) return []
  const factor = ref.quantity * measureFactor(food, ref.measure)
  return food.nutrients.map(n => ({ ...n, amount: n.amount * factor }))
}

// Merge nutrient lists (e.g. from multiple foods in a meal) by key, summing amounts. A key
// simply doesn't appear if nothing contributed it — "assume 0" falls out of the merge, no
// special-casing needed. Never throws: if two contributions to the same key declare different
// units, warn (visible in docker logs) and sum anyway — sumRefs below calls this on 6+ live
// render paths, so a thrown error here would crash core pages over a single bad food edit.
export function sumNutrients(lists: NutrientEntry[][]): NutrientEntry[] {
  const map = new Map<string, NutrientEntry>()
  for (const list of lists) {
    for (const n of list) {
      const cur = map.get(n.key)
      if (cur && cur.unit && n.unit && cur.unit !== n.unit) {
        console.warn(`[recipe] nutrient "${n.key}" unit mismatch: "${cur.unit}" vs "${n.unit}" — summing anyway`)
      }
      map.set(n.key, cur ? { ...cur, amount: cur.amount + n.amount } : { ...n })
    }
  }
  return [...map.values()]
}

// Pull the 4 canonical macros out of a nutrient list, defaulting missing ones to 0.
export function coreMacros(nutrients: NutrientEntry[]): Macros {
  const pick = (key: string) => nutrients.find(n => n.key === key)?.amount ?? 0
  return {
    calories: pick(CORE_MACRO_KEYS.calories),
    protein: pick(CORE_MACRO_KEYS.protein),
    carbs: pick(CORE_MACRO_KEYS.carbs),
    fats: pick(CORE_MACRO_KEYS.fats),
  }
}

// Macros contributed by one ref — frozen fixed-4 shape, used by FoodPicker for per-row/subtotal
// readouts. Internally just the core-macro extraction of the full (dynamic) nutrient scaling.
export function refMacros(ref: IngredientRef, food: Food | undefined): Macros {
  return coreMacros(refNutrients(ref, food))
}

// Frozen signature/return shape — called live across app/page.tsx, app/planner/page.tsx,
// app/print/page.tsx, MealModal, FoodPicker, DayCard. For the full sparse breakdown, use
// nutrientsForRefs instead (meal detail page's Nutrition panel).
export function sumRefs(refs: IngredientRef[], foodsById: Map<number, Food>): Macros {
  return coreMacros(nutrientsForRefs(refs, foodsById))
}

// Day/week totals: the core 4 summed across planner entries (or meals), whose `ingredients`
// is the JSON-encoded ref string. The identical reduce used to be copy-pasted in the home
// page, the planner page, and DayCard.
export function sumEntries(entries: { ingredients: string }[], foodsById: Map<number, Food>): Macros {
  return entries.reduce<Macros>((acc, e) => {
    const m = sumRefs(parseRefs(e.ingredients), foodsById)
    return {
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fats:     acc.fats     + m.fats,
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
}

// Full nutrient breakdown for a set of refs (macros + micros + anything else) — for display
// where granular detail is wanted, not just the core 4.
export function nutrientsForRefs(refs: IngredientRef[], foodsById: Map<number, Food>): NutrientEntry[] {
  return sumNutrients(refs.map(ref => refNutrients(ref, foodsById.get(ref.foodId))))
}

// Placeholder Foods (isPlaceholder: true — "vegetables", "fruit"…) are stand-ins for whatever the
// user hasn't picked yet, not real ingredients: when a recipe using one is added to a planner
// day, drop the placeholder ref (it contributes nothing to macros anyway) and append one blank,
// unresolved slot (foodId: 0 — FoodPicker already renders that as an empty "search food…" row) per
// placeholder found, so opening the ingredient editor shows exactly where to fill something in.
// Returns the placeholder names too, since that info — "vegetables", "fruit" — is only available
// now, before the ref is replaced; use it for a one-time "here's what's missing" message.
export function resolvePlaceholders(
  refs: IngredientRef[],
  foodsById: Map<number, Food>
): { refs: IngredientRef[]; placeholderNames: string[] } {
  const kept: IngredientRef[] = []
  const placeholderNames: string[] = []
  for (const r of refs) {
    const food = foodsById.get(r.foodId)
    if (food?.isPlaceholder) placeholderNames.push(food.name)
    else kept.push(r)
  }
  const blanks: IngredientRef[] = placeholderNames.map(() => ({ foodId: 0, quantity: 0, measure: '' }))
  return { refs: [...kept, ...blanks], placeholderNames }
}

// Persistent "still needs input" check for an already-placed meal — true if any ref is unresolved
// (foodId: 0, or a food that's since been deleted) or still points at a placeholder Food (covers
// data from before this conversion existed). Used for the always-visible planner icon/print badge,
// which — unlike the one-time add message — can't name specific ingredients once converted to a
// blank slot, so it just flags "this meal isn't finished yet."
export function hasUnfilledIngredient(refs: IngredientRef[], foodsById: Map<number, Food>): boolean {
  return refs.some(r => {
    const food = foodsById.get(r.foodId)
    return !food || food.isPlaceholder
  })
}

// Build a lookup from a foods list (rows from /api/foods or prisma). Parses measures/nutrients
// JSON if still a string (DB rows) and leaves already-parsed arrays alone (API rows).
export function foodsMap(
  foods: Array<Omit<Food, 'measures' | 'nutrients'> & { measures: string | Measure[]; nutrients: string | NutrientEntry[] }>
): Map<number, Food> {
  const map = new Map<number, Food>()
  for (const f of foods) {
    map.set(f.id, {
      ...f,
      measures: typeof f.measures === 'string' ? parseMeasures(f.measures) : f.measures,
      nutrients: typeof f.nutrients === 'string' ? parseNutrients(f.nutrients) : f.nutrients,
    })
  }
  return map
}
