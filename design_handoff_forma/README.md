# Handoff: Forma — AI Nutrition & Fitness App

## Overview

Forma is a CasaOS-hosted, mobile-first web app that lets Antonio generate personalised nutrition plans and workout programmes via an AI coach. Quick access on phone — open, tap "Weekend Plan" or "Workout", done.

Companion to **Mise** (meal planner). Same machine, same Docker/CasaOS workflow, different port.

---

## App name & branding

| Token | Value | Notes |
|-------|-------|-------|
| Name | Forma | From "formula", "form", "forming your body" |
| `--accent` | `#1E3A5F` (navy) | Replaces Mise's olive — strength/focus |
| `--energy` | `#D4520C` (orange) | CTAs, generate buttons, motivation |
| Macro colours | Same as Mise | Cross-app visual consistency |
| Typography | Geist + Newsreader | Same stack as Mise |

---

## Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Home dashboard |
| `/coach` | `app/coach/page.tsx` | AI chat + plan generation |
| `/plans` | `app/plans/page.tsx` | Saved nutrition plans |
| `/workouts` | `app/workouts/page.tsx` | Saved + generate workout plans |

All pages: `export const dynamic = 'force-dynamic'` (same rule as Mise — DB queries at runtime).

---

## Design prototype

**Open `forma.html`** (at repo root) in a browser — fully interactive, no server needed.

Prototype shows all 4 screens with mock data. Tab bar navigates between pages. Coach page has a "See Generated Plan" button that reveals the full plan output UI.

Source files in this directory:
- `tokens.css` — full CSS custom property system (import into `app/globals.css`)
- `data.jsx` — mock data shapes (= Prisma query return shapes)
- `components.jsx` — shared components: Icon, MacroRing, TopNav, TabBar, CoachProgress, PlanResultCard
- `page-home.jsx`, `page-coach.jsx`, `page-plans.jsx`, `page-workouts.jsx` — page components
- `app.jsx` — client-side router (replace with Next.js App Router)

---

## Tech stack

Identical to Mise:
- Next.js 16 (App Router)
- Prisma 7 + libSQL adapter
- SQLite at `/DATA/AppData/forma/forma.db`
- TypeScript strict
- CSS custom properties (no Tailwind)
- Docker, CasaOS port **3001** (Mise uses 3000)

---

## Prisma schema (new models)

```prisma
model Profile {
  id                    String   @id @default(cuid())
  // Section 1 — Stats
  age                   Int
  sex                   String   // 'male' | 'female'
  heightCm              Float
  weightKg              Float
  goalWeightKg          Float?
  pace                  String   // 'steady' | 'fast'
  // Section 2 — Lifestyle
  jobType               String   // 'desk' | 'light-physical' | 'manual'
  exerciseDaysPerWeek   Int
  exerciseType          String
  sleepHours            Float
  stressLevel           String   // 'low' | 'moderate' | 'high'
  alcoholDrinksPerWeek  Int
  // Section 3 — Food
  favoriteFoods         String   // JSON array
  dislikedFoods         String   // JSON array
  dietaryRestrictions   String   // JSON array
  cookingStyle          String   // 'scratch' | 'quick' | 'batch'
  adventurousness       Int      // 1–10
  // Section 4 — Snacks
  currentSnacks         String   // JSON array
  snackTrigger          String   // 'hunger' | 'boredom' | 'habit'
  snackPreference       String   // 'sweet' | 'savoury' | 'both'
  nightSnacking         Boolean
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  nutritionPlans        NutritionPlan[]
  workouts              Workout[]
}

model NutritionPlan {
  id              String   @id @default(cuid())
  profileId       String
  profile         Profile  @relation(fields: [profileId], references: [id])
  label           String
  bmr             Float
  tdee            Float
  activityMultiplier Float
  deficit         Int
  targetKcal      Int
  targetProtein   Int
  targetCarbs     Int
  targetFats      Int
  planJson        String   // Full AI-generated plan as JSON string
  createdAt       DateTime @default(now())
}

model Workout {
  id           String   @id @default(cuid())
  profileId    String
  profile      Profile  @relation(fields: [profileId], references: [id])
  label        String
  goal         String   // 'fat-loss' | 'muscle' | 'maintain'
  daysPerWeek  Int
  equipment    String   // 'full-gym' | 'home-basic' | 'bodyweight'
  isActive     Boolean  @default(true)
  workoutJson  String   // Full AI-generated workout as JSON string
  createdAt    DateTime @default(now())
}
```

Store full AI output as JSON string in `planJson` / `workoutJson`. Parse client-side. Avoids over-normalising a schema that changes with every AI response.

---

## AI integration

### Environment variable
```
ANTHROPIC_API_KEY=sk-ant-...
```
Add to `.env` locally and to CasaOS container env at deploy time.

### API routes

**POST `/api/coach/generate`**
```typescript
// Request body
{ profileId: string } // or inline profile if not yet saved

// Uses nutrition_prompt.txt system prompt (see /nutrition_prompt.txt)
// Sections 1–4 collected via chat; this route fires after Section 4

// Response: SSE stream
// data: { type: 'delta', content: '...' }
// data: { type: 'done', planJson: '{ targetKcal, targetProtein, ... }' }
```

**POST `/api/workouts/generate`**
```typescript
// Request body
{ profileId: string, goal: string, daysPerWeek: number, equipment: string }

// Response: SSE stream → structured WorkoutPlan JSON
```

### Anthropic SDK pattern (server-side only)
```typescript
// app/api/coach/generate/route.ts
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',    // or claude-sonnet-4-6 for speed
    max_tokens: 4096,
    system: NUTRITION_SYSTEM_PROMPT,
    messages: chatHistory,       // collected from DB
  });

  // Return as SSE
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`));
        }
      }
      const final = await stream.finalMessage();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, content: final.content[0].text })}\n\n`));
      controller.close();
    }
  });
  return new Response(readable, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

The system prompt = contents of `/nutrition_prompt.txt` with a JSON output instruction appended:

```
[After collecting all 4 sections, output your full response as valid JSON matching this schema:]
{
  "targetKcal": number,
  "targetProtein": number,
  "targetCarbs": number,
  "targetFats": number,
  "bmr": number,
  "tdee": number,
  "activityMultiplier": number,
  "days": [{ "day": string, "theme": string, "totalKcal": number, "totalProtein": number, "totalCarbs": number, "totalFats": number, "meals": [...] }],
  "snackSwaps": [...],
  "rules": [...],
  "timeline": [...],
  "hydration": { "targetL": number, "tips": [...] },
  "supplements": [...]
}
```

---

## Deployment (CasaOS)

Same pattern as Mise. New app = new container.

```bash
# Project root structure (new repo)
forma/
  app/
  prisma/
  scripts/migrate.js   # same pattern as Mise
  deploy.sh            # same pattern, port 3001
  Dockerfile
  docker-compose.yml
```

`docker-compose.yml`:
```yaml
services:
  forma:
    build: .
    container_name: forma
    ports:
      - "3001:3000"
    volumes:
      - /DATA/AppData/forma:/data
    environment:
      - DATABASE_URL=file:/data/forma.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: unless-stopped
```

`deploy.sh`: copy from Mise, change container name to `forma`.

---

## Key differences from Mise

| | Mise | Forma |
|-|------|-------|
| Port | 3000 | 3001 |
| Accent | Olive `#2F5237` | Navy `#1E3A5F` |
| Energy colour | — | Orange `#D4520C` |
| Data | User-entered meals | AI-generated plans |
| External API | None | Anthropic Claude |
| Env vars | DB only | DB + ANTHROPIC_API_KEY |
| Data folder | `/DATA/AppData/mise/` | `/DATA/AppData/forma/` |

---

## Implementation order (suggested)

1. Scaffold Next.js app, copy `globals.css` from tokens in this handoff
2. Prisma schema + migration
3. Home page (static, no API)
4. Profile setup flow (form, save to DB)
5. Coach page — chat UI, section-by-section collect
6. `/api/coach/generate` — Anthropic integration, streaming response
7. Parse + render PlanResultCard, save plan to DB
8. Plans page — list + expand
9. `/api/workouts/generate` — workout plan AI route
10. Workouts page — generate form + saved list
11. Deploy to CasaOS

---

## Notes for builder

- **Do not expose `ANTHROPIC_API_KEY` to the client.** All Claude calls must be in API routes (`app/api/`).
- Chat history for each session: store in DB as messages array on the NutritionPlan row (or separate ChatMessage table), not in client state alone.
- Parse AI JSON output defensively — validate before saving to DB.
- The `nutrition_prompt.txt` file is the source of truth for the AI system prompt. Read it from disk at runtime (`fs.readFileSync`) or embed as a constant.
- Profile can be set up once and reused for all future generations (fast path: just tap "Generate" with saved profile).
- Weekend plan mode: generate only Sat + Sun days (pass `mode: 'weekend'` to API, generate 2 days instead of 7).
