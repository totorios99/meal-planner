/**
 * Adds Meal.stages (JSON Stage[] — see lib/recipe.ts) for the cook-mode chart, and backfills
 * it from the existing steps so no meal renders an empty grid. Everything lives in
 * migration.js (no migration.sql) because the backfill must READ steps in the same run that
 * adds the column, and scripts/migrate.js always runs migration.sql fully before migration.js.
 *
 * Re-run safety: the column add is guarded by PRAGMA table_info, and the backfill only touches
 * rows still holding the '[]' default — a meal whose stages were hand-authored (or already
 * backfilled) is never overwritten.
 */
module.exports = async (db) => {
  const { rows: cols } = await db.execute('PRAGMA table_info("Meal")')
  if (!cols.some((c) => c.name === 'stages')) {
    await db.execute('ALTER TABLE "Meal" ADD COLUMN stages TEXT NOT NULL DEFAULT \'[]\'')
  }

  const { rows: meals } = await db.execute(
    `SELECT id, steps FROM "Meal" WHERE stages IS NULL OR trim(stages) IN ('', '[]')`
  )

  let filled = 0
  for (const m of meals) {
    let steps = []
    try {
      const parsed = JSON.parse(m.steps || '[]')
      if (Array.isArray(parsed)) steps = parsed.filter((s) => typeof s === 'string' && s.trim())
    } catch {
      // A malformed steps column shouldn't fail the migration — that meal just gets no stages.
    }
    if (steps.length === 0) continue

    // One stage per step, one slot each, no timer, no ingredient span (from > to). The chart
    // degenerates to a plain step ladder, which is the right fallback for un-authored meals.
    const stages = steps.map((name, i) => ({
      name: name.trim(),
      timing: '',
      seconds: 0,
      slot: i,
      from: 0,
      to: -1,
    }))
    await db.execute({
      sql: 'UPDATE "Meal" SET stages=? WHERE id=?',
      args: [JSON.stringify(stages), m.id],
    })
    filled++
  }

  console.log(`[migrate] meal_stages: column ready, backfilled ${filled} of ${meals.length} unset meals from steps`)
}
