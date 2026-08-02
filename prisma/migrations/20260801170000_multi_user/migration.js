/**
 * Multi-user: every owned table gains a `userId` (Clerk user id, a string like "user_2abc…")
 * and existing rows are backfilled to MISE_OWNER_USER_ID.
 *
 * migration.js with no migration.sql because the backfill must happen BETWEEN adding the
 * column and creating the composite unique index on Food — scripts/migrate.js runs the whole
 * of migration.sql before any JS, so a Prisma-generated diff would try to build the index over
 * rows whose userId is still ''. Same reason as 20260721170000_food_nutrients.
 *
 * Re-run safety: every step is guarded (PRAGMA table_info / IF NOT EXISTS / "WHERE userId = ''"),
 * so a run that dies partway can simply be run again.
 */
const OWNED = ['Meal', 'WeeklyPlan', 'Food', 'Settings']

module.exports = async (db) => {
  const hasColumn = async (table, col) => {
    const { rows } = await db.execute(`PRAGMA table_info("${table}")`)
    return rows.some((r) => r.name === col)
  }

  // 1. Add the column everywhere. NOT NULL DEFAULT '' rather than nullable: SQLite can't add a
  //    bare NOT NULL column to a populated table, and '' is an obviously-invalid Clerk id, so a
  //    row this migration failed to claim is easy to spot rather than silently ownerless.
  for (const table of OWNED) {
    if (!(await hasColumn(table, 'userId'))) {
      await db.execute(`ALTER TABLE "${table}" ADD COLUMN "userId" TEXT NOT NULL DEFAULT ''`)
    }
  }

  // 2. Backfill. Only demand the env var if there is actually something to claim, so a fresh
  //    install (empty DB) migrates without it.
  let orphans = 0
  for (const table of OWNED) {
    const { rows } = await db.execute(`SELECT COUNT(*) AS n FROM "${table}" WHERE "userId" = ''`)
    orphans += Number(rows[0].n)
  }

  if (orphans > 0) {
    const owner = process.env.MISE_OWNER_USER_ID
    if (!owner) {
      throw new Error(
        `multi_user: ${orphans} pre-existing rows have no owner and MISE_OWNER_USER_ID is not set. ` +
          `Sign in to Clerk once, copy your user id (user_…), and re-run with it set. ` +
          `Refusing to leave rows unowned.`
      )
    }
    for (const table of OWNED) {
      await db.execute({
        sql: `UPDATE "${table}" SET "userId" = ? WHERE "userId" = ''`,
        args: [owner],
      })
    }
    console.log(`[migrate] multi_user: backfilled ${orphans} rows to ${owner}`)
  }

  // 3. Food.name was globally unique; it is now unique per user, so two people can each have
  //    their own "Rice". Drop before create — the old index would still reject the second one.
  await db.execute('DROP INDEX IF EXISTS "Food_name_key"')
  await db.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Food_userId_name_key" ON "Food"("userId", "name")'
  )

  // 4. Settings was a singleton whose `id` column is `INTEGER PRIMARY KEY DEFAULT 1`. Prisma
  //    omits defaulted columns on insert, so the second user to save a preference would have
  //    hit a primary-key collision on id = 1. SQLite can't retype a primary key in place, so
  //    rebuild the table with userId as the key and drop `id` entirely.
  if (await hasColumn('Settings', 'id')) {
    await db.execute(`
      CREATE TABLE "Settings_new" (
        "userId" TEXT NOT NULL PRIMARY KEY,
        "calories" REAL NOT NULL DEFAULT 2450,
        "protein" REAL NOT NULL DEFAULT 160,
        "carbs" REAL NOT NULL DEFAULT 270,
        "fats" REAL NOT NULL DEFAULT 80,
        "recipeView" TEXT NOT NULL DEFAULT 'chart',
        "units" TEXT NOT NULL DEFAULT 'US',
        "theme" TEXT NOT NULL DEFAULT 'system',
        "plannerFullTitles" BOOLEAN NOT NULL DEFAULT false,
        "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await db.execute(`
      INSERT INTO "Settings_new"
        ("userId","calories","protein","carbs","fats","recipeView","units","theme","plannerFullTitles","weekStartsOn","updatedAt")
      SELECT "userId","calories","protein","carbs","fats","recipeView","units","theme","plannerFullTitles","weekStartsOn","updatedAt"
      FROM "Settings" WHERE "userId" != ''
    `)
    await db.execute('DROP TABLE "Settings"')
    await db.execute('ALTER TABLE "Settings_new" RENAME TO "Settings"')
    console.log('[migrate] multi_user: Settings rebuilt with userId as primary key')
  }

  // 5. Lookup indexes for the userId filter every query now carries.
  for (const table of ['Meal', 'WeeklyPlan', 'Food']) {
    await db.execute(
      `CREATE INDEX IF NOT EXISTS "${table}_userId_idx" ON "${table}"("userId")`
    )
  }

  console.log('[migrate] multi_user: done')
}
