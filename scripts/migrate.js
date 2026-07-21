/**
 * Applies pending SQL migrations using @libsql/client directly.
 * Avoids needing Prisma CLI or native engine binaries at runtime.
 */
const { createClient } = require('@libsql/client')
const { readFileSync, readdirSync, statSync, mkdirSync, existsSync } = require('fs')
const { dirname, join } = require('path')

async function migrate() {
  const dbUrl = process.env.DATABASE_URL ?? 'file:/app/data/meal-planner.db'

  if (dbUrl.startsWith('file:')) {
    mkdirSync(dirname(dbUrl.replace('file:', '')), { recursive: true })
  }

  const db = createClient({ url: dbUrl })

  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const { rows } = await db.execute('SELECT name FROM _migrations')
  const applied = new Set(rows.map(r => r.name))

  const migrDir = join(__dirname, '..', 'prisma', 'migrations')
  const pending = readdirSync(migrDir)
    .filter(d => statSync(join(migrDir, d)).isDirectory())
    .sort()
    .filter(d => !applied.has(d))

  for (const name of pending) {
    const sqlPath = join(migrDir, name, 'migration.sql')
    if (existsSync(sqlPath)) {
      const statements = readFileSync(sqlPath, 'utf8')
        .split(';')
        .map(s => s.replace(/^([ \t]*--[^\n]*\n)*/,'').trim())
        .filter(s => s)
      for (const stmt of statements) {
        await db.execute(stmt)
      }
    }

    // Optional JS data step for transforms impractical in SQL (module.exports = async (db) => {...})
    const jsPath = join(migrDir, name, 'migration.js')
    if (existsSync(jsPath)) {
      await require(jsPath)(db)
    }

    await db.execute({ sql: 'INSERT INTO _migrations (name) VALUES (?)', args: [name] })
    console.log(`[migrate] applied: ${name}`)
  }

  await db.close()
  console.log('[migrate] database ready')
}

migrate().catch(err => {
  console.error('[migrate] failed:', err)
  process.exit(1)
})
