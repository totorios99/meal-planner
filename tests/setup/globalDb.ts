import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Builds the test database once per run, before any worker forks.
 *
 * `scripts/migrate.js` is invoked rather than `prisma migrate deploy` because it is the only
 * thing that reproduces the schema: 8 of the 20 migrations are JS-only data steps that the
 * Prisma CLI skips entirely. It is CommonJS and calls process.exit on failure, so it runs as
 * a child process — with stdio inherited, a migration failure kills the run with the real
 * error on screen instead of a swallowed one.
 */
export default function setup() {
  const url = process.env.DATABASE_URL

  // The guard. `.test-db` is the only database this file may ever delete. Without it, a
  // stray DATABASE_URL — from the repo's own .env, which points at the real dev database —
  // would send `rmSync` and every truncating beforeEach at real user data.
  // Do not simplify this away.
  if (!url?.includes('.test-db')) {
    throw new Error(
      `Refusing to run: DATABASE_URL is ${url ?? '(unset)'}, which is not a .test-db path. ` +
      'The test suite deletes and truncates its database.'
    )
  }

  const root = fileURLToPath(new URL('../../', import.meta.url))
  rmSync(new URL('../../.test-db', import.meta.url), { recursive: true, force: true })

  execFileSync(process.execPath, ['scripts/migrate.js'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
}
