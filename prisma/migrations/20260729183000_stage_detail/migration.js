/**
 * Splits each stage's single text field into a short card label + the full instruction.
 *
 * 20260729161500_meal_stages backfilled `name` with the entire step ("Herby yoghurt: mix the
 * yoghurt, crushed garlic, lemon zest, chives… Spread on a plate…" — 136 chars), but a stage card
 * is a chart cell a few words wide. This moves the instruction to `detail` and derives a label,
 * mirroring stageLabel() in lib/recipe.ts (duplicated rather than imported: migrations are frozen
 * CommonJS and must keep behaving the same even when that helper later changes).
 *
 * Re-run safety: a stage that already has a `detail`, or whose name is already short, is left
 * alone — so this is a no-op on a second run and on any hand-authored stage.
 */
const LABEL_MAX = 46

function stageLabel(instruction) {
  const text = String(instruction || '').trim()
  if (text.length <= LABEL_MAX) return text

  const colon = text.indexOf(':')
  if (colon > 0 && colon <= LABEL_MAX) return text.slice(0, colon).trim()

  const clause = text.search(/[,.;—]/)
  if (clause > 0 && clause <= LABEL_MAX) return text.slice(0, clause).trim()

  const cut = text.lastIndexOf(' ', LABEL_MAX)
  return `${text.slice(0, cut > 0 ? cut : LABEL_MAX).trim()}…`
}

module.exports = async (db) => {
  const { rows: meals } = await db.execute(
    `SELECT id, stages FROM "Meal" WHERE stages IS NOT NULL AND trim(stages) NOT IN ('', '[]')`
  )

  let changed = 0
  for (const m of meals) {
    let stages
    try {
      stages = JSON.parse(m.stages)
    } catch {
      continue // malformed column — parseStages() already treats it as no stages
    }
    if (!Array.isArray(stages)) continue

    let touched = false
    const next = stages.map((st) => {
      if (!st || typeof st.name !== 'string') return st
      if (st.detail || st.name.length <= LABEL_MAX) return st
      touched = true
      return { ...st, name: stageLabel(st.name), detail: st.name.trim() }
    })
    if (!touched) continue

    await db.execute({
      sql: 'UPDATE "Meal" SET stages=? WHERE id=?',
      args: [JSON.stringify(next), m.id],
    })
    changed++
  }

  console.log(`[migrate] stage_detail: split long stage names into label + detail on ${changed} of ${meals.length} meals`)
}
