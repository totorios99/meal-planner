# Meal Planner — Implementation Plan

## Stack (Verified)
- Next.js 15, App Router, TypeScript, Turbopack
- Tailwind CSS v4 (CSS-first, no tailwind.config.js)
- Prisma 5+ with SQLite (`provider = "sqlite"`)
- node-cron for Sunday midnight archive+reset
- Docker + docker-compose with `./data:/app/db` volume

---

## Phase 0 — Documentation Discovery ✅

**Allowed APIs (verified):**
- `NextRequest` / `NextResponse` from `'next/server'`
- API routes: `app/api/[resource]/route.ts`, export `GET | POST | PUT | DELETE`
- Prisma init: `npx prisma init --datasource-provider sqlite`
- Prisma migrate: `npx prisma migrate dev --name init`
- Tailwind v4: `@import "tailwindcss"` in globals.css, `postcss.config.mjs` with `@tailwindcss/postcss`
- node-cron: `cron.schedule('0 0 * * 0', fn)` = every Sunday midnight

**Anti-patterns:**
- No `tailwind.config.js` (v4 is CSS-first)
- No `pages/` directory (App Router only)
- node-cron must init server-side only (`typeof window === 'undefined'`)

---

## Phase 1 — Project Scaffold

**Goal:** Working Next.js 15 project with Tailwind v4 and Prisma wired up.

### Tasks

1. `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
2. Install deps:
   ```
   npm install @prisma/client prisma node-cron
   npm install --save-dev @types/node-cron
   ```
3. `npx prisma init --datasource-provider sqlite`
4. Set `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="file:/app/db/meal-planner.db"
   ```
   And `.env.local` for dev:
   ```
   DATABASE_URL="file:./db/meal-planner.db"
   ```
5. Create `db/` directory (gitignored); add `db/*.db` to `.gitignore`
6. Verify Tailwind v4 globals.css has `@import "tailwindcss";`
7. Verify `postcss.config.mjs` uses `@tailwindcss/postcss`

### Verification
- `npm run dev` → localhost:3000 renders default Next.js page
- `npx prisma studio` → opens (no models yet, that's fine)

---

## Phase 2 — Database Schema

**Goal:** Full Prisma schema matching spec relations.

### Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Meal {
  id          Int    @id @default(autoincrement())
  title       String
  description String @default("")
  calories    Float
  protein     Float
  carbs       Float
  fats        Float
  imageUrl    String @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  weeklyPlanMeals WeeklyPlanMeal[]
}

model WeeklyPlan {
  id        Int      @id @default(autoincrement())
  weekStart DateTime // Monday of the week (ISO)
  isActive  Boolean  @default(false)
  archivedAt DateTime?
  createdAt DateTime @default(now())

  days WeeklyPlanDay[]
}

model WeeklyPlanDay {
  id             Int        @id @default(autoincrement())
  weeklyPlanId   Int
  weeklyPlan     WeeklyPlan @relation(fields: [weeklyPlanId], references: [id], onDelete: Cascade)
  dayIndex       Int        // 0=Monday … 6=Sunday
  isDismissed    Boolean    @default(false)
  justification  String     @default("")

  meals WeeklyPlanMeal[]

  @@unique([weeklyPlanId, dayIndex])
}

model WeeklyPlanMeal {
  id              Int           @id @default(autoincrement())
  weeklyPlanDayId Int
  weeklyPlanDay   WeeklyPlanDay @relation(fields: [weeklyPlanDayId], references: [id], onDelete: Cascade)
  mealId          Int
  meal            Meal          @relation(fields: [mealId], references: [id])
  slotIndex       Int           // 0-5 (up to 6 slots/day)
  portionMultiplier Float       @default(1.0)

  @@unique([weeklyPlanDayId, slotIndex])
}
```

### Tasks
1. Write schema above to `prisma/schema.prisma`
2. `npx prisma migrate dev --name init`
3. Create `lib/prisma.ts` singleton:
   ```typescript
   import { PrismaClient } from '@prisma/client'
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
   export const prisma = globalForPrisma.prisma ?? new PrismaClient()
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
   ```

### Verification
- `npx prisma studio` shows all 4 tables
- `db/meal-planner.db` file exists under `./db/`

---

## Phase 3 — Meal Repository: API + UI Grid

**Goal:** Full CRUD for meals + responsive masonry card grid (macros hidden on cards).

### API Routes

`app/api/meals/route.ts` — GET all, POST create  
`app/api/meals/[id]/route.ts` — GET one, PUT update, DELETE

**GET /api/meals** → `prisma.meal.findMany({ orderBy: { createdAt: 'desc' } })`  
**POST /api/meals** → `prisma.meal.create({ data: body })`  
**PUT /api/meals/[id]** → `prisma.meal.update({ where: { id }, data: body })`  
**DELETE /api/meals/[id]** → `prisma.meal.delete({ where: { id } })`

### UI Components

`app/meals/page.tsx` — page  
`components/meals/MealGrid.tsx` — CSS columns masonry grid  
`components/meals/MealCard.tsx` — shows title, description, image ONLY  
`components/meals/MealModal.tsx` — create/edit form (all fields including macros)

**MealGrid layout (Tailwind v4):**
```tsx
<div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
  {meals.map(m => <MealCard key={m.id} meal={m} />)}
</div>
```

**MealCard** — NO macro display. Title + description + image (if set). Edit/Delete buttons.

**MealModal** — controlled form state, all fields, `fetch('/api/meals', { method: 'POST', body: JSON.stringify(data) })`.

### Verification
- Create 3 meals → appear in grid
- Edit meal → changes persist
- Delete meal → removed from grid
- Macros NOT visible on cards

---

## Phase 4 — Weekly Planner: Calendar + Picking + Portion Multiplier

**Goal:** 7-day board (Mon–Sun), meal slot picking/swapping, portion multiplier per slot.

### API Routes

`app/api/plans/active/route.ts` — GET active plan (create if none), returns full nested data  
`app/api/plans/[planId]/days/[dayId]/meals/route.ts` — POST add meal to slot  
`app/api/plans/[planId]/days/[dayId]/meals/[mealId]/route.ts` — PUT (multiplier), DELETE  

**GET /api/plans/active logic:**
```typescript
// Find or create WeeklyPlan where isActive=true
// If none exists, create one with weekStart = this Monday
// Create 7 WeeklyPlanDay records (dayIndex 0-6) if missing
// Return plan with days.meals.meal (include nested)
```

**PUT meal slot** → update `portionMultiplier` only

### UI Components

`app/planner/page.tsx` — page  
`components/planner/WeekBoard.tsx` — 7-column grid (desktop), vertical stack (mobile)  
`components/planner/DayCard.tsx` — day header + meal slots + totals section  
`components/planner/MealSlot.tsx` — shows assigned meal OR empty picker trigger  
`components/planner/MealPicker.tsx` — modal/drawer: search meal list, click to assign  
`components/planner/PortionInput.tsx` — number input `step=0.1 min=0.1`, updates multiplier on blur  

**Hot-swap:** clicking assigned meal in slot opens MealPicker; selecting new meal calls DELETE old + POST new to same slotIndex.

**Portion scaling (client-side computed):**
```typescript
const scaledCalories = meal.calories * portionMultiplier
const scaledProtein  = meal.protein  * portionMultiplier
// etc.
```

**Day column layout (2–6 slots):** slots rendered by slotIndex 0–5; empty slots show `+ Add Meal` button that opens picker.

### Verification
- Assign meal to Mon slot 0 → persists on refresh
- Change multiplier to 1.5 → day totals update instantly (no page reload)
- Swap meal in slot → old meal gone, new meal appears in same slot
- Mobile: columns stack vertically, touch-friendly

---

## Phase 5 — Day Dismissal, Watermark Justification, Sunday Auto-Reset

**Goal:** Dismiss toggle, justification watermark, automated Sunday midnight archive+reset.

### API Routes

`app/api/plans/[planId]/days/[dayId]/route.ts` — PATCH `{ isDismissed, justification }`

### Dismissal UI

In `DayCard.tsx`:
- Toggle button: "Dismiss Day" / "Restore Day"
- When `isDismissed=true` OR no meals AND not dismissed → show watermark overlay
- Watermark: semi-transparent overlay with `<textarea>` for justification text (auto-saves on blur via PATCH)
- Overlay text: if justification empty → placeholder "What happened today?"

### Sunday Auto-Reset Cron

`lib/cron.ts`:
```typescript
import cron from 'node-cron'
import { prisma } from './prisma'

export function startCronJobs() {
  // Every Sunday at midnight (local time)
  cron.schedule('0 0 * * 0', async () => {
    const active = await prisma.weeklyPlan.findFirst({ where: { isActive: true } })
    if (!active) return

    // Archive: mark as not active, set archivedAt
    await prisma.weeklyPlan.update({
      where: { id: active.id },
      data: { isActive: false, archivedAt: new Date() }
    })

    // Create fresh plan for upcoming week (Monday)
    const nextMonday = getNextMonday()
    const newPlan = await prisma.weeklyPlan.create({
      data: { weekStart: nextMonday, isActive: true }
    })
    // Create 7 blank days
    for (let i = 0; i < 7; i++) {
      await prisma.weeklyPlanDay.create({
        data: { weeklyPlanId: newPlan.id, dayIndex: i }
      })
    }
  })
}

function getNextMonday(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1) // Sunday → Monday
  d.setHours(0, 0, 0, 0)
  return d
}
```

**Cron init** in `app/layout.tsx` (server component boundary — use `instrumentation.ts`):

`instrumentation.ts` (Next.js 15 built-in hook, runs once on server start):
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronJobs } = await import('./lib/cron')
    startCronJobs()
  }
}
```

### Historical Quick-Fill

`app/api/plans/history/route.ts` — GET all archived plans with their days+meals  
`app/api/plans/[planId]/clone/route.ts` — POST: copy a past plan's structure into current active plan as placeholders

`components/planner/QuickFill.tsx` — dropdown at top of planner, lists archived weeks by `weekStart`, click "Apply" → POST to clone route → refetch active plan

### Verification
- Dismiss day → watermark appears with textarea
- Type justification → persists on refresh
- Clone past week → meals appear as placeholders in current board
- (Manual test cron): call archive logic via `/api/plans/archive-now` test endpoint

---

## Phase 6 — Analytical UI Widgets (Macro Bars + SVG Pie)

**Goal:** Per-day totals with progress bars and macro distribution pie chart.

### Daily Totals Computation

```typescript
// In DayCard — computed from weeklyPlanMeals
const totals = day.meals.reduce((acc, wpm) => ({
  calories: acc.calories + wpm.meal.calories * wpm.portionMultiplier,
  protein:  acc.protein  + wpm.meal.protein  * wpm.portionMultiplier,
  carbs:    acc.carbs    + wpm.meal.carbs    * wpm.portionMultiplier,
  fats:     acc.fats     + wpm.meal.fats     * wpm.portionMultiplier,
}), { calories: 0, protein: 0, carbs: 0, fats: 0 })
```

### Macro Targets

Stored in `localStorage` (no DB needed for targets — user preference):
```typescript
const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 200, fats: 65 }
```

Settings modal accessible from planner header.

### Progress Bars (`components/planner/MacroBar.tsx`)

Pure Tailwind div bars — no library:
```tsx
<div className="h-2 rounded-full bg-gray-200">
  <div
    className="h-2 rounded-full bg-blue-500 transition-all"
    style={{ width: `${Math.min(pct, 100)}%` }}
  />
</div>
```
Color: green <70%, yellow 70–90%, red >100%.

### SVG Pie Chart (`components/planner/MacroPie.tsx`)

Pure SVG, no library. Protein/Carbs/Fats as 3 arc segments:
```tsx
// Convert macros to calories: protein*4, carbs*4, fats*9
// Compute angle for each segment
// Use SVG path with arc commands
// Size: 48x48px, centered in day card
```

Implementation uses `stroke-dasharray` + `stroke-dashoffset` technique on 3 overlapping `<circle>` elements (simpler than arcs):
- r=15.9, circumference=99.9
- Each segment offset computed from cumulative angle

### Verification
- Add 2 meals to a day → bars fill proportionally
- Change multiplier → bars update immediately
- Pie shows 3 colored segments proportional to macro cals

---

## Phase 7 — Print Optimization View

**Goal:** Clean fridge-printout table, aggregated by day only.

### Route

`app/print/page.tsx` — server component, fetches active plan, renders print table

### Layout

```tsx
// No navigation, no images, no buttons
// Just: <table> with columns: Day | Calories | Protein | Carbs | Fats | Notes
// One row per day (aggregated totals)
// Justification notes shown in Notes column
// Dismissed days: show "Dismissed — [justification]"
```

### CSS

In `app/print/page.tsx` or a dedicated `print.css`:
```css
@media print {
  nav, button, img { display: none !important; }
  body { font-family: serif; font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4pt 8pt; }
}

@media screen {
  /* Show "Print" button, clean white background preview */
}
```

### Verification
- Navigate to `/print` → clean table visible
- Cmd+P / Ctrl+P → no nav/buttons/images in print dialog
- Each day is ONE row (not per-meal breakdown)

---

## Phase 8 — Docker Deployment

**Goal:** Dockerfile + docker-compose for CasaOS NAS deployment.

### `Dockerfile`

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /app/db && chown nextjs:nodejs /app/db

USER nextjs
EXPOSE 3000

ENV DATABASE_URL="file:/app/db/meal-planner.db"
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### `docker-compose.yml`

```yaml
services:
  meal-planner:
    build: .
    container_name: meal-planner
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/db
    environment:
      - DATABASE_URL=file:/app/db/meal-planner.db
      - NODE_ENV=production
    restart: unless-stopped
```

### `next.config.ts` — add standalone output:

```typescript
const nextConfig = {
  output: 'standalone',
}
export default nextConfig
```

### Verification
- `docker compose up --build` → container starts
- `./data/meal-planner.db` created on host
- App accessible at `http://localhost:3000`
- Container restart → data persists

---

## Execution Order

| Phase | Est. Complexity | Dependencies |
|-------|----------------|--------------|
| 1 — Scaffold | Low | none |
| 2 — Schema | Low | Phase 1 |
| 3 — Meals CRUD | Medium | Phase 2 |
| 4 — Planner | High | Phase 3 |
| 5 — Dismissal + Cron | Medium | Phase 4 |
| 6 — Analytics | Medium | Phase 4 |
| 7 — Print | Low | Phase 5, 6 |
| 8 — Docker | Low | Phase 7 |

---

## File Tree (Target)

```
meal-planner/
├── app/
│   ├── api/
│   │   ├── meals/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── plans/
│   │       ├── active/route.ts
│   │       ├── history/route.ts
│   │       └── [planId]/
│   │           ├── clone/route.ts
│   │           └── days/[dayId]/
│   │               ├── route.ts
│   │               └── meals/
│   │                   ├── route.ts
│   │                   └── [mealId]/route.ts
│   ├── meals/page.tsx
│   ├── planner/page.tsx
│   ├── print/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── meals/
│   │   ├── MealGrid.tsx
│   │   ├── MealCard.tsx
│   │   └── MealModal.tsx
│   └── planner/
│       ├── WeekBoard.tsx
│       ├── DayCard.tsx
│       ├── MealSlot.tsx
│       ├── MealPicker.tsx
│       ├── PortionInput.tsx
│       ├── MacroBar.tsx
│       ├── MacroPie.tsx
│       └── QuickFill.tsx
├── lib/
│   ├── prisma.ts
│   └── cron.ts
├── prisma/
│   └── schema.prisma
├── db/          (gitignored)
├── instrumentation.ts
├── next.config.ts
├── Dockerfile
├── docker-compose.yml
└── .env.local
```
