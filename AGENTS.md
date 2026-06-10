<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Mise — Meal Planner

Personal meal planner. Solo developer. Next.js 16, Prisma 7 + libSQL adapter, SQLite, TypeScript.

## Dev workflow

- `npm run dev` — local development, HMR, no Docker needed
- Dev server runs on `localhost:3000`; LAN access requires `allowedDevOrigins` (already in `next.config.ts`)
- Never run Docker during dev iteration — slow, no HMR

## Branching

- `main` = stable, deployable at any time
- `feat/...` for new features; direct commits to `main` for small fixes
- Suggest opening a feature branch when work spans multiple sessions or touches core data models

## Database & migrations

- Schema: `prisma/schema.prisma`
- Add fields: `npx prisma migrate dev --name <name>` — creates SQL file in `prisma/migrations/`
- Never edit migration SQL files manually
- `migrate.js` runs at container startup and applies pending migrations automatically — no manual deploy step for DB changes
- Prisma client location: `app/generated/prisma/` (generated, do not edit)

## Deployment (CasaOS, same machine)

- CasaOS runs on the same machine as dev
- Container name: `mise`, port `3000`, data at `/DATA/AppData/mise/`
- To deploy: `sudo ./deploy.sh` from project root — rebuilds image and restarts container
- Suggest running `sudo ./deploy.sh` after merging to `main` when changes affect server-side code, API routes, DB schema, or the Docker setup
- No CI/CD, no registry — local image only

## Server components & static rendering

- Pages that query the DB must export `export const dynamic = 'force-dynamic'` to avoid build-time prerender errors
- API routes are already dynamic by default

## Key files

- `next.config.ts` — `allowedDevOrigins` for LAN HMR, `output: 'standalone'` for Docker
- `scripts/migrate.js` — custom migration runner (avoids Prisma CLI in Alpine container)
- `deploy.sh` — rebuild image + restart container
- `lib/prisma.ts` — Prisma client singleton with libSQL adapter
- `components/Nav.tsx` — theme toggle (system/light/dark 3-state cycle)

## Design system

- CSS custom properties only — no Tailwind utility classes in component markup
- Tokens defined in `app/globals.css`: surfaces (`--bg`, `--bg-elev`, `--bg-sunken`), ink, accent (olive `#2F5237`), macro colours (`--protein` / `--carbs` / `--fats`)
- Dark mode via `[data-theme="dark"]` attribute on `<html>`, set by `Nav.tsx`
- Design handoff lives in `design_handoff_meal_planner/` — reference for component shapes and visual spec

## Git & SSH

- Remote: `git@github.com:totorios99/meal-planner.git` (SSH)
- Push requires SSH agent running: `eval (ssh-agent -c) && ssh-add ~/.ssh/id_ed25519`
- Agent does not persist across terminal sessions — re-run before pushing

## Companion app — Forma

- Second CasaOS app: AI nutrition + workout planner
- Design handoff: `design_handoff_forma/` — full spec, Prisma schema, Anthropic SDK pattern
- Prototype: `forma.html` — open in browser, no server needed
- Builds as separate repo/container on port `3001`; shares same design token conventions as Mise
