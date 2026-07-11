# Mise — Meal Planner

A personal meal planning app self-hosted on CasaOS. Manage a cookbook of meals, build weekly plans with macro tracking, and print weekly menus.

![Home](uploads/home.png)

## Features

- **Cookbook** — add meals with calories, macros (P/C/F), tags, and photos
- **Weekly Planner** — drag meals into Mon–Sun slots, track daily macro totals, mark days off
- **Print view** — clean printable weekly menu, hides UI chrome
- **Dark mode** — system/light/dark three-state toggle, persists across sessions
- **Mobile-first** — bottom tab bar (fixed, safe-area aware), compact top pill nav, works on phone browser
- **Desktop nav** — icon + label links, glass pill style

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via Prisma 7 + libSQL adapter |
| Language | TypeScript (strict) |
| Styles | CSS custom properties (no Tailwind) |
| Deployment | Docker on CasaOS |

## Project structure

```
app/
  page.tsx          # Home dashboard
  meals/            # Cookbook page
  planner/          # Weekly planner
  print/            # Print view
  api/              # REST API routes
components/
  Nav.tsx           # Top nav + theme toggle
  Icon.tsx          # SVG icon set
  meals/            # Cookbook components (MealGrid, MealModal, …)
  planner/          # Planner components (WeekBoard, DayCard, MealSlot, …)
lib/
  prisma.ts         # Prisma client singleton
prisma/
  schema.prisma     # Meal, WeeklyPlan, WeeklyPlanDay, WeeklyPlanMeal models
scripts/
  migrate.js        # Migration runner (used at container startup)
design_handoff_meal_planner/   # Original design spec + prototype
design_handoff_forma/          # Design handoff for Forma (companion app)
```

## Dev workflow

```bash
npm install
npm run dev -- --port 3020   # localhost:3020 with HMR
```

Database migrations:

```bash
npx prisma migrate dev --name <description>
```

## Deployment (CasaOS)

```bash
sudo ./deploy.sh     # rebuilds Docker image, restarts container
```

Container runs on **port 3000**, data persisted at `/DATA/AppData/mise/`.

> Do not run Docker during dev iteration — use `npm run dev` for HMR.

### Import API key

`POST /api/meals/import` lets external agents push structured recipes. It requires
`x-api-key` matching the `MISE_API_KEY` env var — put it in a `.env` next to
`docker-compose.yml` (gitignored). If unset, import is disabled.

## MCP server (agent access)

`mcp/server.mjs` exposes the whole app to MCP agents over stdio — meal CRUD,
import, favorites, and weekly-plan manipulation — plus an `extract-recipe`
prompt and `mise://recipe-schema` resource carrying the extraction rules in
`mcp/extraction-prompt.md`. It talks to a running Mise instance over HTTP and
is not part of the Docker image.

Client config:

```json
{
  "mcpServers": {
    "mise": {
      "command": "node",
      "args": ["/path/to/meal-planner/mcp/server.mjs"],
      "env": {
        "MISE_URL": "http://localhost:3000",
        "MISE_API_KEY": "<same key as the container>"
      }
    }
  }
}
```

## Data model

```
Meal                  — cookbook entries (title, tag, kcal, protein, carbs, fats, imageUrl,
                        ingredients/steps as JSON string[], prep/cook minutes, servings, isFavorite)
WeeklyPlan            — a week's plan (weekStart, isActive)
  WeeklyPlanDay       — one day slot (dayIndex 0–6, isDismissed, justification note)
    WeeklyPlanMeal    — a meal in a day slot (mealId, quantity)
```

## Companion app

**Forma** — AI-powered nutrition + workout planner (next project, port 3001).  
Design handoff: [`design_handoff_forma/README.md`](design_handoff_forma/README.md)  
Prototype: [`forma.html`](forma.html) — open in browser, no server needed.
