import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — rebuilt by `prisma generate`, never edited.
    "app/generated/**",
    // Throwaway databases the suites build.
    ".test-db/**",
  ]),

  {
    // The two files under scripts/ are plain CommonJS on purpose: package.json has no
    // `"type": "module"` (and must not get one — `node scripts/migrate.js` runs at container
    // start), so `require` is the only thing that works there. The TS rule does not know that.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    // ── Client data fetching on mount ──
    //
    // `useEffect(() => { fetchX() }, [fetchX])`. The rule is conservative: it flags any call
    // to a function that transitively setStates, whether or not the call is synchronous.
    //
    // React's own guidance is that fetching in an effect is the correct pattern when you have
    // no framework data-fetching mechanism, which is the case for these pages — they are
    // client components that refetch after their own mutations. "Fixing" this means moving the
    // data layer into server components or a query library, which is an architectural change,
    // not a lint cleanup. Left deliberately, not deferred.
    files: [
      "app/foods/page.tsx",
      "app/meals/page.tsx",
      "app/page.tsx",
      "app/planner/page.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  {
    // ── CookMode's timer arming ──
    //
    // The effect arms a wall-clock deadline when the slot, run or cooking state changes —
    // genuinely "synchronize with an external system" (the clock), which is what effects are
    // for, but the values it writes are React state, so the rule fires.
    //
    // Deliberately NOT refactored yet: this is the most intricate file in the repo (a deadline
    // timer with pause-banking and re-arm counters) and it currently has no test coverage.
    // Phase 4 of the test plan puts that timer under test; restructuring it first would be
    // doing the risky change in the order that makes it dangerous. Revisit once it is covered.
    files: ["components/meals/CookMode.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
