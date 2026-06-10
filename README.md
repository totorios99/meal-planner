# Mise — Meal Planner

A personal meal planning app self-hosted on CasaOS. Manage a cookbook of meals, build weekly plans with macro tracking, and print weekly menus.

![Home](uploads/home.png)

## Features

- **Cookbook** — add meals with calories, macros (P/C/F), tags, and photos
- **Weekly Planner** — drag meals into Mon–Sun slots, track daily macro totals, mark days off
- **Print view** — clean printable weekly menu, hides UI chrome
- **Dark mode** — system/light/dark three-state toggle, persists across sessions
- **Mobile-first** — fixed bottom tab bar, safe-area aware, works on phone browser

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
npm run dev          # localhost:3000 with HMR
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

## Data model

```
Meal                  — cookbook entries (title, tag, kcal, protein, carbs, fats, imageUrl)
WeeklyPlan            — a week's plan (weekStart, isActive)
  WeeklyPlanDay       — one day slot (dayIndex 0–6, isDismissed, justification note)
    WeeklyPlanMeal    — a meal in a day slot (mealId, quantity)
```

## Companion app

**Forma** — AI-powered nutrition + workout planner (next project, port 3001).  
Design handoff: [`design_handoff_forma/README.md`](design_handoff_forma/README.md)  
Prototype: [`forma.html`](forma.html) — open in browser, no server needed.
