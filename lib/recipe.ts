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

// Food source of truth. Macros are per 1 baseUnit.
export type Food = {
  id: number
  name: string
  baseUnit: string
  calories: number
  protein: number
  carbs: number
  fats: number
  measures: Measure[]
}

// A meal/placement line-item: references a food + how much of which measure.
export type IngredientRef = { foodId: number; quantity: number; measure: string }

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

// ingredients live in a String column as JSON refs — parse with a shape-guard, [] on failure
export function parseRefs(s: string): IngredientRef[] {
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map(r => ({
      foodId: num(r?.foodId),
      quantity: num(r?.quantity),
      measure: String(r?.measure ?? ''),
    })).filter(r => r.foodId > 0)
  } catch {
    return []
  }
}

// Base units in 1 of `measure`. Base unit (or unknown measure) → 1.
export function measureFactor(food: Food, measure: string): number {
  if (!measure || measure === food.baseUnit) return 1
  const m = food.measures.find(x => x.unit === measure)
  return m ? m.perBase : 1
}

// Macros contributed by one ref, given its food.
export function refMacros(ref: IngredientRef, food: Food | undefined): Macros {
  if (!food) return { calories: 0, protein: 0, carbs: 0, fats: 0 }
  const amount = ref.quantity * measureFactor(food, ref.measure)
  return {
    calories: food.calories * amount,
    protein: food.protein * amount,
    carbs: food.carbs * amount,
    fats: food.fats * amount,
  }
}

export function sumRefs(refs: IngredientRef[], foodsById: Map<number, Food>): Macros {
  return refs.reduce<Macros>((acc, ref) => {
    const m = refMacros(ref, foodsById.get(ref.foodId))
    return {
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fats: acc.fats + m.fats,
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
}

// Build a lookup from a foods list (rows from /api/foods or prisma). Parses measures JSON if
// still a string (DB rows) and leaves already-parsed arrays alone (API rows).
export function foodsMap(foods: Array<Omit<Food, 'measures'> & { measures: string | Measure[] }>): Map<number, Food> {
  const map = new Map<number, Food>()
  for (const f of foods) {
    map.set(f.id, {
      ...f,
      measures: typeof f.measures === 'string' ? parseMeasures(f.measures) : f.measures,
    })
  }
  return map
}
