import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

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
        },
      },
      {
        resolve: {
          tsconfigPaths: true,
          alias: {
            // `server-only`'s main entry is a bare `throw` — it exists to fail the build
            // when a server module is pulled into client code. Under Next the
            // `react-server` condition swaps in the package's own empty.js; nothing sets
            // that condition here, so point at empty.js directly. Aliasing to the file
            // the package already ships means no stub of our own to keep in sync.
            'server-only': 'server-only/empty.js',
          },
        },
        test: {
          name: 'api',
          environment: 'node',
          include: ['tests/api/**/*.test.ts'],
          globalSetup: ['./tests/setup/globalDb.ts'],
          setupFiles: ['./tests/setup/api.ts'],
          // One worker: the routes share a single SQLite file and lib/rateLimit.ts keeps
          // module-level counters. Parallel files would race on both.
          fileParallelism: false,
        },
      },
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: 'components',
          environment: 'happy-dom',
          include: ['tests/components/**/*.test.tsx'],
          setupFiles: ['./tests/setup/components.ts'],
        },
      },
    ],
  },
})
