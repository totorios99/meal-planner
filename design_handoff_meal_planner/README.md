# Handoff: Meal Planner UI/UX Redesign

## Overview
A polished, mobile-first redesign of an existing meal-planning app ("Mise" is a placeholder brand name — rename freely). The system already works functionally; this handoff covers **UI/UX only**. It distills the pre-cooking flow — find recipes → check ingredients → shop — into three stages plus a new home page:

- **Home** (`/`) — new dashboard (did not exist before)
- **Cookbook** (`/meals`) — recipe library with macros
- **Planner** (`/planner`) — weekly meal plan
- **Print** (`/print`) — fridge reference (menu only, no ingredients)

The app is single-user. Primary usage is **mobile**.

---

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — runnable prototypes showing the intended look, layout, and behavior. **They are not production code to paste in.**

Your task: **recreate these designs inside the existing codebase** (Next.js + TypeScript + Prisma, per the repo at github.com/totorios99/meal-planner) using its established patterns — real routing, real data from Prisma, your component conventions, and (if present) Tailwind or your CSS solution. Translate the CSS in `tokens.css` into whatever styling system the app uses. Keep the visual result pixel-accurate.

The bundled `meal-planner.html` is the generated, runnable preview. Read the **individual source files** (`tokens.css`, `components.jsx`, `app.jsx`, `page-*.jsx`, `data.jsx`) — the HTML is just those concatenated.

---

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified. Recreate the UI pixel-perfectly using the codebase's libraries and patterns. Exact hex values, font sizes, and spacing are documented below and in `tokens.css`.

---

## Design Tokens
All tokens live as CSS custom properties in `tokens.css` under `:root`, with overrides under `[data-theme="dark"]` and `[data-accent="..."]`. Reproduce these as your theme tokens.

### Color — Light (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF8F3` | App background (warm paper) |
| `--bg-elev` | `#FFFFFF` | Cards, sheets, inputs |
| `--bg-sunken` | `#F2EFE7` | Hover fills, progress tracks |
| `--ink` | `#14110D` | Primary text |
| `--ink-2` | `#3E3A33` | Secondary text |
| `--ink-3` | `#6B6357` | Tertiary / meta text |
| `--ink-4` | `#A8A095` | Faint text, units |
| `--line` | `#E8E2D4` | Default borders |
| `--line-strong` | `#D4CCB8` | Hover borders, dashed dividers |

### Color — Accent (default "olive")
| Token | Value |
|---|---|
| `--accent` | `#2F5237` |
| `--accent-2` | `#3D6B49` (hover) |
| `--accent-soft` | `#E6EDE6` (tinted fills) |
| `--accent-ink` | `#1A3022` (text on soft) |

Alternate accents (selectable via Tweaks; implement as a user setting if desired): terracotta `#B5563A`, slate `#2A3343`, ink `#14110D`.

### Color — Macros (consistent everywhere)
| Macro | Value |
|---|---|
| kcal | `#14110D` (ink) |
| Protein | `#3F4FB2` (indigo) |
| Carbs | `#C28A2C` (amber) |
| Fats | `#8C4A8A` (plum) |

### Color — States
| Token | Value | Use |
|---|---|---|
| `--warn` | `#C5601C` | Over-target macros, off-day notes |
| `--warn-soft` | `#FBEEDB` | Off-day toggle background |
| `--danger` | `#B0382E` | Delete actions |
| `--off` | `#98897A` | Off-day text |
| `--off-soft` | `#F0EAE0` | Off-day card background |

### Color — Dark theme
Full dark palette is in `tokens.css` under `[data-theme="dark"]`. Key values: `--bg #14110D`, `--bg-elev #1C1915`, `--ink #F6F2E8`, `--accent #7CB48A`. Macros shift lighter for contrast (protein `#8995D6`, carbs `#D9AC60`, fats `#C28DBE`).

### Typography
| Token | Stack | Use |
|---|---|---|
| `--sans` | **Geist**, Inter, system-ui | All UI text |
| `--serif` | **Newsreader**, Cormorant Garamond, Georgia | Display: page titles, meal names, dates, large numerals |
| `--mono` | Geist Mono | (available, used sparingly) |

Both Google Fonts (Geist + Newsreader). Type uses `font-feature-settings: "ss01","cv11"` and tabular numbers (`font-variant-numeric: tabular-nums`, class `.num`) on all numeric data.

Display sizes: page title 44px serif (52 cozy / 36 compact / 32 mobile); meal name 22px serif; section title 24px serif. Body 13.5–15px sans. Eyebrows 12px uppercase, `letter-spacing: 0.08em`.

### Spacing, radius, shadow
- Radii: `--r-sm 6 / --r-md 10 / --r-lg 14 / --r-xl 20` px
- Card shadow on hover: `0 12px 32px -16px` of ink at 25% — kept very soft
- Density modes via `[data-density]`: `compact` / `standard` (default) / `cozy` adjust paddings, gaps, and title sizes (see `tokens.css`).

---

## Data Shape
Mirrors the Prisma model (see `data.jsx` for the mock). A **Meal**:

```ts
{
  id: string
  name: string
  description: string   // one-line
  photo: string         // image URL (every meal has a real photo)
  tag: string           // e.g. "Breakfast", "High protein", "Pre-workout"
  kcal: number
  protein: number       // grams
  carbs: number         // grams
  fats: number          // grams
}
```

**Daily targets** (user setting): `{ kcal: 2400, protein: 180, carbs: 240, fats: 80 }`.

**Plan** — keyed by day (Mon–Sun), each day:
```ts
{
  date: number          // day of month
  off: boolean          // "off day" — travel, eating out, etc.
  note: string          // free text (reason for off, or a day note)
  items: { mealId: string, qty: number }[]
}
```

Helper logic (in `data.jsx`): `dayTotals(day)` sums `meal.macro * qty` across items, returns zeros if `off`. Off days contribute nothing to weekly totals and aren't counted in "days on".

---

## Screens / Views

### 1. Home (`/`)
**Purpose:** At-a-glance daily + weekly status; jump-off point to all other stages.

**Layout (desktop):** Max-width 1280px, 28px side padding. Top to bottom:
1. **Page header** — eyebrow (`Tuesday · May 19, 2026`), serif title (`Good morning, <em>Toto.</em>` — the name is italic serif), one-line subtitle.
2. **Two-column grid** (`1.4fr 1fr`, 24px gap) — stacks under 920px:
   - **Today's meals card** (`--r-xl`, 28px pad): header with count + total kcal; list of meals, each row = 56px thumbnail · name + macro dots (P/C/F with colored 7px dots) · right-aligned kcal. Footer has two ghost buttons ("Open planner", "Browse meals"). Off-day shows an empty state with the trip note.
   - **Today's macros card**: serif heading + "Targets" button; a **macro donut ring** (SVG) showing % of kcal target in the center, with three arc segments (protein/carbs/fats) on the outer ring; beside it, three labeled progress bars (`MacroRows`) showing `current/target g`. Bars turn `--warn` if over target.
3. **Week strip** (`--r-xl`): header (`This week`, date range, "days on", total kcal) + "Open planner" link; a 7-column grid of day cells. Each cell: day abbreviation, large serif date numeral, up to 3 meal names (truncated), kcal at bottom. Today's cell uses accent border + `--accent-soft` bg. Off days use `--off-soft` and show the note.
4. **Quick actions** — 3 cards (icon tile + title + subtitle): "Plan the weekend", "Add a new meal", "Print this week".
5. **Recently added** — section header + "View cookbook" link; 3 meal cards (same as Cookbook cards).

**Mobile:** Header stacks. Today/macros stack. **Week strip becomes a horizontal scroll-snap rail** (each day cell `min-width: 132px`). Quick actions go single-column.

### 2. Cookbook (`/meals`)
**Purpose:** Browse, search, filter, and manage the recipe library.

**Layout:** Page header (eyebrow `Cookbook · N meals`, serif title `Your <em>recipes,</em> with macros.`, subtitle) with two right-aligned buttons: ghost "Generate ideas", primary "New meal". **Toolbar**: search input (icon inside, max 420px) + filter **chips** (All + each unique tag; active chip = filled accent). **Meal grid**: `repeat(3, 1fr)`, 20px gap → 2 cols under 1080px → 1 col under 720px.

**Meal card** (`--r-lg`):
- Image area, `aspect-ratio: 4/3`, `object-fit: cover`. Image scales `1.03` on hover. A **tag pill** sits top-left (white 92% bg, uppercase 11px). A hover **overlay** (gradient from bottom) reveals Edit + Delete icon buttons bottom-right.
- Body (16–18px pad): serif meal name (22px), one-line description (`--ink-3`), then a **macro row** separated by a dashed top border — 4 equal columns: kcal / Protein / Carbs / Fats, each with a tiny uppercase label (macro ones prefixed with a colored dot) and a tabular-nums value (`g` suffix in `--ink-4`).

**Empty state** when no matches: serif "No meals match that." + hint.

**Mobile:** Grid → 1 column. Filter chips become a horizontal scroll rail. Edit/Delete overlay is **always visible** (no hover on touch). Header buttons go full-width.

### 3. Planner (`/planner`)
**Purpose:** Build the week's meals; see daily macro totals against targets.

**Layout:** Wider container (max 1480px). Page header: eyebrow `Weekly planner`, serif title `Week of <em>May 18.</em>`, subtitle (`N days planned · total kcal · total protein`). Right side: **week navigator** (prev/next chevrons + label `May 18 – 24`) and a "Targets" ghost button.

**Quick-fill bar** (`--accent-soft` tinted): label "Quick-fill from past week" + a `<select>` of prior weeks + "Apply" button. (Implements the user's #1 ask — quickly fill a plan instead of repeating meals.)

**7-column day grid** (12px gap → 2 cols under 1080px → 1 col under 720px). Each **day column** (`--r-lg`, `min-height: 480px` desktop):
- **Header**: day name (uppercase) + serif date; an **off-toggle** icon button (plus icon when on, trip/airplane icon when off). Today's column gets an accent border + ring.
- **Body**: list of **plan-meal** chips — each shows meal name, kcal (× qty), a **quantity stepper** (− / value / +), and a remove × that appears on hover. Below the meals, a dashed **"+ Add meal"** button opens the meal picker sheet.
- **Off day**: body replaced by a centered trip icon + an inline note input ("Why off? e.g. Trip, eating out").
- **Footer** (dashed top border): a 2×2 grid of day totals — kcal / P / C / F, each with a colored dot, label, and `current/target` value (turns `--warn` when over). Then an inline "+ Add note" text input.

**Meal picker sheet** (modal): search field + scrollable list of all meals (44px thumb · name · macro summary · plus icon). Clicking adds to the day.

**Mobile:** Grid → 1 column (day cards size to content). Quick-fill goes vertical. Sheet **docks to the bottom** with rounded top corners.

### 4. Print (`/print`)
**Purpose:** A clean weekly reference for the fridge. **Menu only — no ingredients** (user checks ingredients in-app).

**Layout:** Max 1100px. A screen-only **toolbar** (hidden on print): title "Weekly Reference" + date range, with "Edit plan" (→ planner) and primary "Print" (`window.print()`) buttons. Below, the **paper**: white sheet with editorial styling.
- **Header**: serif `Weekly <em>Meal</em> Reference` + right-aligned meta block (week label, date range, print date), separated by a 2px ink rule.
- **7-column hairline table** (1px ink borders): each day = day name + date (or "off"); a list of meals (name, qty, and per-serving-scaled macros `kcal · P · C · F`); a footer with a **large serif total kcal numeral** and a P/C/F line in tabular figures. Off days show a centered serif italic note. Notes render as a warn-accented left-border callout.
- **Footer**: "Mise · Meal planner" + "For ingredients & cooking instructions, see the app."

**Print CSS** (`@media print`): hides nav, tab bar, and toolbar; removes paper shadow/border; forces white background. In dark theme the paper stays light (ink on paper) so it always prints correctly.

**Mobile:** Toolbar stacks; the 7-col table keeps `min-width: 720px` and **scrolls horizontally** inside the paper so it stays legible.

---

## Navigation
- **Desktop:** sticky top nav (`--bg` at 88% + blur). Brand (serif "M" mark + "Mise") on the left → Home; inline links Home/Cookbook/Planner/Print (active = `--bg-sunken` fill); theme toggle on the right.
- **Mobile (≤768px):** top nav keeps only brand + theme toggle; **fixed bottom tab bar** appears — 4 tabs (Home/Cookbook/Planner/Print) each with icon + label, 52px min height, active tab in accent. Honors `env(safe-area-inset-bottom)`. App content gets bottom padding so it clears the bar.

---

## Interactions & Behavior
- **Routing:** Replace the prototype's `route` state with real Next.js routes (`/`, `/meals`, `/planner`, `/print`).
- **Quantity stepper:** − clamps at 1; + increments. Updates the meal's contribution to day totals live.
- **Remove meal:** removes the item from the day.
- **Off-day toggle:** flips `off`; when turning off with no note, defaults note to "Off day". Off days zero out macro totals and drop from weekly aggregates.
- **Add meal:** opens picker sheet; selecting appends `{ mealId, qty: 1 }` to the target day.
- **Quick-fill:** copy a prior week's plan into the current week (wire to backend).
- **Macro bars/totals:** turn `--warn` (orange) when a value exceeds its target.
- **Print:** primary button calls `window.print()`.
- **Hover:** cards lift `translateY(-2px)` + soft shadow + image zoom — **disabled under `@media (hover: none)`** (touch).
- **Transitions:** 0.15s on color/background/border; 0.2–0.4s on transforms/images. Keep subtle.

### Theme (important)
Three-state preference: **Auto / Light / Dark**, default **Auto**.
- Auto follows `window.matchMedia('(prefers-color-scheme: dark)')` and **live-updates** when the OS changes (listen to the `change` event).
- The resolved theme is written to `document.documentElement[data-theme]`.
- The top-right toggle sets an **explicit override** (opposite of what's currently shown); the override persists. A small accent dot on the toggle indicates Auto mode is active.
- Persist the preference (localStorage or user settings). The Tweaks panel in the prototype is a prototyping aid — **do not ship it**; instead expose Auto/Light/Dark in real app settings, and the quick toggle in the nav.

---

## State Management
- `theme`: `'system' | 'light' | 'dark'` (persisted) + derived `systemDark` from matchMedia.
- `plan`: the week object (from backend/Prisma).
- Per-meal `qty`, per-day `off` and `note` — mutate plan and persist.
- UI: meal-picker sheet open + target day; new-meal sheet open.
- Cookbook: search query + active tag filter (client-side filtering of the meal list).

## Data Fetching
- Cookbook: list meals.
- Planner/Home/Print: load the plan for a given week (Home & Print are read-mostly views of the same plan the Planner edits).
- Mutations: add/remove meal to day, change qty, toggle off, edit note, quick-fill from a past week, create/edit/delete meal.

---

## Assets
- **Meal photos:** the prototype uses Unsplash URLs as stand-ins (see `data.jsx`). Replace with the user's real meal photos.
- **Icons:** inline stroke SVGs (1.6 stroke width) defined in the `Icon` component in `components.jsx` — search, plus, minus, x, edit, trash, chevrons, settings, printer, calendar, book, home, flame, trip (airplane), sparkle, arrow-right, sun, moon, check. Swap for your icon library (e.g. Lucide — these match Lucide's style closely) if you have one.
- **Fonts:** Geist + Newsreader from Google Fonts.

---

## Files in this bundle
| File | What it is |
|---|---|
| `meal-planner.html` | Runnable preview (all files concatenated). Open in a browser to interact. |
| `tokens.css` | **All design tokens + component styles.** The source of truth for visuals. |
| `data.jsx` | Mock data + shape + `dayTotals`/helpers — mirrors the Prisma model. |
| `components.jsx` | Shared UI: `Nav` (top + bottom tab bar), `MacroRing`, `MacroRows`, `Icon` set. |
| `page-home.jsx` | Home dashboard. |
| `page-cookbook.jsx` | Cookbook grid + search/filter. |
| `page-planner.jsx` | Weekly planner grid + steppers + off-days. |
| `page-print.jsx` | Print/fridge reference. |
| `app.jsx` | Router, theme logic, meal-picker + new-meal sheets. |

**Start with `tokens.css` and `data.jsx`**, then build the four pages. Ignore the `tweaks-panel.jsx` mechanism — it's a prototype-only tool, not part of the product.
