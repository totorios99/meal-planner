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
    // ── Known backlog, not a blanket exemption ──
    //
    // These files predate the React Compiler lint rules and trip them. The rules stay at
    // `error` everywhere else, so anything NEW of this shape still fails CI; here they are
    // warnings so the gate can be switched on today rather than after a refactor.
    //
    // This list is the todo list. Delete an entry when its file is fixed — do not add to it
    // without a reason worth writing down.
    //
    //   set-state-in-effect  — a setState called synchronously in an effect body, which
    //                          cascades renders. Usually fixable by deriving during render
    //                          or moving the call into the callback that caused it.
    //   refs                 — a ref read during render rather than in an effect/handler.
    files: [
      "app/foods/page.tsx",
      "app/meals/page.tsx",
      "app/page.tsx",
      "app/planner/page.tsx",
      "components/foods/FoodModal.tsx",
      "components/meals/CookMode.tsx",
      "components/meals/MealModal.tsx",
      "components/meals/PhotoInput.tsx",
      "components/planner/QuickFill.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
