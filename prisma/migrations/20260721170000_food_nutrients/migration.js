/**
 * Data migration: Food's 4 fixed macro columns (calories/protein/carbs/fats) become one
 * dynamic/sparse `nutrients` JSON column (see lib/recipe.ts NutrientEntry). Everything lives
 * in migration.js (no migration.sql) because the old columns must be READ before they're
 * dropped, and scripts/migrate.js always runs migration.sql fully before migration.js.
 *
 * Re-run safety: three distinct states are possible if a prior run threw partway through, and
 * this checks PRAGMA table_info on every run to figure out which one it's resuming from —
 * (1) nutrients column not yet added, (2) all 4 old columns still present (safe to re-run the
 * transform — it's a pure overwrite from source-of-truth columns — then drop all 4), or
 * (3) some but not all old columns already dropped by a prior run that died mid-DROP (SQLite
 * requires one ALTER TABLE...DROP COLUMN per statement) — nutrients was already populated
 * before any DROP ran, so this just finishes dropping the stragglers without re-transforming.
 */
module.exports = async (db) => {
  const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
  const MACRO_COLS = ['calories', 'protein', 'carbs', 'fats']

  const { rows: cols } = await db.execute('PRAGMA table_info("Food")')
  const colNames = new Set(cols.map((c) => c.name))

  if (!colNames.has('nutrients')) {
    await db.execute('ALTER TABLE "Food" ADD COLUMN nutrients TEXT NOT NULL DEFAULT \'[]\'')
  }

  const remaining = MACRO_COLS.filter((c) => colNames.has(c))

  if (remaining.length === 0) {
    console.log('[migrate] food_nutrients: old macro columns already gone, nothing to do')
    return
  }

  if (remaining.length < MACRO_COLS.length) {
    // Partial-drop resume: nutrients was already populated in a prior run before any DROP
    // executed, so just finish removing the columns a previous attempt didn't get to.
    for (const c of remaining) {
      await db.execute(`ALTER TABLE "Food" DROP COLUMN ${c}`)
    }
    console.log(`[migrate] food_nutrients: resumed partial drop, removed: ${remaining.join(', ')}`)
    return
  }

  // Full transform: all 4 old columns present (first run, or a re-run before any DROP ran).
  const { rows: foods } = await db.execute('SELECT id, calories, protein, carbs, fats FROM "Food"')
  for (const f of foods) {
    const nutrients = [
      { key: 'calories', label: 'Calories', unit: 'kcal', amount: num(f.calories), group: 'macro' },
      { key: 'protein_g', label: 'Protein', unit: 'g', amount: num(f.protein), group: 'macro' },
      { key: 'carbs_g', label: 'Carbs', unit: 'g', amount: num(f.carbs), group: 'macro' },
      { key: 'fat_g', label: 'Fat', unit: 'g', amount: num(f.fats), group: 'macro' },
    ]
    await db.execute({
      sql: 'UPDATE "Food" SET nutrients=? WHERE id=?',
      args: [JSON.stringify(nutrients), f.id],
    })
  }

  // Verify before dropping: SUM of each old column must equal the SUM of its canonical
  // nutrient key across the freshly written JSON. One runnable check, not just faith in the
  // loop above — this is a destructive step against real hand-curated production data.
  const { rows: [sums] } = await db.execute(
    'SELECT SUM(calories) AS c, SUM(protein) AS p, SUM(carbs) AS cb, SUM(fats) AS ft FROM "Food"'
  )
  const { rows: nutrientRows } = await db.execute('SELECT nutrients FROM "Food"')
  const post = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  for (const row of nutrientRows) {
    for (const n of JSON.parse(row.nutrients)) {
      if (n.key in post) post[n.key] += n.amount
    }
  }
  const close = (a, b) => Math.abs(num(a) - b) < 0.01
  if (!close(sums.c, post.calories) || !close(sums.p, post.protein_g) ||
      !close(sums.cb, post.carbs_g) || !close(sums.ft, post.fat_g)) {
    throw new Error(
      `[migrate] food_nutrients: sum mismatch — pre calories/protein/carbs/fats = ` +
      `${sums.c}/${sums.p}/${sums.cb}/${sums.ft}, post = ` +
      `${post.calories}/${post.protein_g}/${post.carbs_g}/${post.fat_g}`
    )
  }

  for (const c of MACRO_COLS) {
    await db.execute(`ALTER TABLE "Food" DROP COLUMN ${c}`)
  }

  console.log(`[migrate] food_nutrients: converted ${foods.length} foods to dynamic nutrients, verified sums, dropped old columns`)
}
