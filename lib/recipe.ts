// steps are stored as JSON-encoded string[] columns (SQLite)
export function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

// A recipe/placement line-item: macros are absolute for the current quantity.
// Changing quantity scales macros by new/old (see scaleIngredient).
export type Ingredient = {
  name: string
  quantity: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type Macros = { calories: number; protein: number; carbs: number; fats: number }

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

// ingredients live in a String column as JSON — parse with a shape-guard, [] on failure
export function parseIngredients(s: string): Ingredient[] {
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map(i => ({
      name: String(i?.name ?? ''),
      quantity: num(i?.quantity),
      unit: String(i?.unit ?? ''),
      calories: num(i?.calories),
      protein: num(i?.protein),
      carbs: num(i?.carbs),
      fats: num(i?.fats),
    }))
  } catch {
    return []
  }
}

export function sumIngredients(items: Ingredient[]): Macros {
  return items.reduce<Macros>((acc, i) => ({
    calories: acc.calories + i.calories,
    protein: acc.protein + i.protein,
    carbs: acc.carbs + i.carbs,
    fats: acc.fats + i.fats,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
}

// Scale a line-item to a new quantity, scaling its macros linearly from the old quantity.
// Guards quantity 0 (can't derive per-unit) by leaving macros untouched.
export function scaleIngredient(item: Ingredient, quantity: number): Ingredient {
  if (item.quantity <= 0) return { ...item, quantity }
  const factor = quantity / item.quantity
  return {
    ...item,
    quantity,
    calories: item.calories * factor,
    protein: item.protein * factor,
    carbs: item.carbs * factor,
    fats: item.fats * factor,
  }
}
