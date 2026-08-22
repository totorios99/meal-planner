import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
// Computed here, not in globalSetup: `test.env` is read at config-eval time, so this reaches
// every forked worker. A path chosen inside globalSetup would not — process.env set there
// does not reliably cross the fork boundary.
// ponytail: one fixed path, so two concurrent local runs would collide. Add a PID suffix and
// inject() if that ever happens.
const TEST_DB = `file:${root}.test-db/test.db`

// globalSetup runs in the main process BEFORE `test.env` is applied to workers, so it would
// otherwise see whatever DATABASE_URL the repo's .env supplies — the real dev database. Set it
// here, at config-eval time, so the one constant reaches both the setup stage and every worker.
process.env.DATABASE_URL = TEST_DB

/**
 * Three projects rather than one config, because the three layers need different
 * environments and different amounts of scaffolding:
 *
 *  - `unit`       pure functions in lib/. No setup at all — that is the point of them.
 *  - `api`        real route handlers against a real temp SQLite. Needs the server-only
 *                 alias and the Clerk mock (see tests/setup/) or the imports throw.
 *  - `components` React, so a DOM.
 *
 * `npm test` runs all three; `vitest --project api` runs one.
 *
 * `.mts`, not `.ts`: package.json has no `"type": "module"` and must not get one —
 * scripts/migrate.js is CommonJS and runs at container start in production.
 *
 * `resolve.tsconfigPaths` resolves the `@/*` alias from tsconfig.json natively; the
 * vite-tsconfig-paths plugin is no longer needed for it.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['lib/**/*.test.ts'],
          // Distinct groupOrder per project is required once they differ in worker count
          // (the api project runs single-file). Ordering them also puts the fast pure tests
          // first, so a broken parser fails before the database is even built.
          sequence: { groupOrder: 0 },
        },
      },
      {
        resolve: {
          tsconfigPaths: true,
          alias: {
            // `server-only`'s main entry is a bare `throw` — it exists to fail the build
            // when a server module is pulled into client code. Under Next the
            // `react-server` condition swaps in the package's own empty.js; nothing sets
            // that condition here, so point at empty.js directly. Aliased by absolute path
            // rather than as `server-only/empty.js`, because the package's `exports` map
            // declares only "." and Vite honours it. Still the file the package ships, so
            // there is no stub of our own to keep in sync.
            'server-only': `${root}node_modules/server-only/empty.js`,
            // The real auth() calls next/headers, which rejects outside a Next request scope,
            // so a route handler cannot be invoked at all without this. An alias resolves
            // before any module executes — no vi.mock hoisting order to reason about.
            '@clerk/nextjs/server': `${root}tests/setup/clerk.ts`,
          },
        },
        test: {
          name: 'api',
          environment: 'node',
          include: ['tests/api/**/*.test.ts'],
          sequence: { groupOrder: 1 },
          globalSetup: ['./tests/setup/globalDb.ts'],
          setupFiles: ['./tests/setup/api.ts'],
          // One process, one module registry: one PrismaClient (lib/prisma.ts caches on
          // globalThis), one libsql connection, one rateLimit map. That is also exactly how
          // production runs — a single container with a single Node process — so the
          // module-level limiter state leaks between files here the way it does in prod, and
          // is reset explicitly rather than hidden by isolation.
          isolate: false,
          // Sequential files in one worker, sharing a module registry: one PrismaClient
          // (lib/prisma.ts caches on globalThis), one libsql connection, one rateLimit map.
          fileParallelism: false,
          env: {
            DATABASE_URL: TEST_DB,
            MISE_ADMIN_SECRET: 'test-admin-secret-0123456789',
            MISE_OWNER_USER_ID: 'user_owner',
          },
        },
      },
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: 'components',
          environment: 'happy-dom',
          include: ['tests/components/**/*.test.tsx'],
          sequence: { groupOrder: 2 },
          setupFiles: ['./tests/setup/components.ts'],
        },
      },
    ],
  },
})
