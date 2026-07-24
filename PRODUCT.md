# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo user (Antonio, the developer) — a single-user personal tool, not shared
with a household or other viewers.

## Product Purpose

Mise is a self-hosted personal meal planner: a cookbook of meals, a
Monday–Sunday weekly planner, and a printable weekly reference, all tracking
macros (calories/protein/carbs/fats, plus optional micronutrients) against a
user-set daily target. Success is a week planned in advance whose logged
meals hit that target, with a physical printout to follow while shopping and
cooking.

## Positioning

No single differentiator dominates by design — Mise combines three pieces
that together replace a notes app + a tracking app + a recipe manager:

- **Foods source-of-truth**: nutrition data lives on a `Food` entity, not
  copied per recipe. Correcting a food's macros propagates to every meal and
  plan placement that references it.
- **AI recipe capture**: an MCP agent pipeline (`mcp/server.mjs`) turns a
  TikTok/Reels/YouTube-Shorts link into a structured, macro-tracked cookbook
  entry — transcribing audio, reading on-screen/caption text, pulling a
  finished-dish frame — rather than manual data entry.
- **Print-ready physical reference**: the weekly plan renders to a clean,
  chrome-free printable page for offline use while shopping/cooking.

## Operating Context

- Runs in Docker on a home CasaOS server (container `mise`, port 3000, data
  at `/DATA/AppData/mise/`); push-to-`main` on GitHub triggers a GHCR build
  that a self-hosted watchtower auto-deploys.
- Used both at a desktop (planning, food/recipe authoring) and on a phone
  (PWA-installable via iOS Add to Home Screen; bottom tab bar nav) —
  day-to-day glancing at the plan and macro totals happens on mobile.
- Recipes are frequently sourced from short-form cooking video (TikTok
  mainly), captured through the MCP import pipeline rather than typed in
  by hand.
- Weekly macro target (calories/protein/carbs/fats) is user-set and stored
  client-side; the current default seed is 2000 kcal / 150P / 200C / 65F,
  editable per user, not a fixed product value.

## Capabilities and Constraints

- Cookbook: meals with ingredients (referencing Foods), steps, prep/cook
  time, servings, photo, tags, up to 5 favorites.
- Weekly planner: drag meals into day slots, per-day and per-week macro
  totals against target, mark a day off with a note, per-placement
  ingredient edits that don't affect the source recipe.
- Foods library: per-baseUnit sparse nutrient list (not just the 4 core
  macros — any micro/compound), unit-conversion measures (cup, tbsp, piece,
  etc.), placeholder foods (e.g. "vegetables") that intentionally contribute
  0 macros and prompt the user to specify a real ingredient later.
- Print view: printable weekly menu + aggregated shopping list.
- Theming: light/dark/system, persisted.
- No multi-user accounts, no auth beyond a single API key gating the
  agent-import endpoint — single-tenant by design, not a constraint to
  route around.

## Brand Commitments

Name: **Mise** (from "mise en place"). Olive accent (`#2F5237`), warm
surface palette, serif/display headline pairing over CSS custom properties
(no Tailwind utility classes in markup). Full spec in
`design_handoff_meal_planner/`.

## Evidence on Hand

Live production data: ~90 curated foods (many with real product photos) and
~20 recipes, several imported from real TikTok videos via the MCP pipeline.
`design_handoff_meal_planner/` holds the original visual spec/prototype.
No user testimonials, case studies, or third-party press exist or should be
implied — this is a personal tool, not a marketed product.

## Product Principles

1. **One source of truth for nutrition.** A Food's macros are authored once
   and referenced everywhere; never duplicate/copy macro data onto a meal.
2. **Capture over data entry.** Recipe intake should default to "point at a
   video/photo and let the agent extract it," with manual entry as the
   fallback, not the primary path.
3. **The plan must survive without a screen.** The print view is a first-class
   surface, not an afterthought export.
4. **Mobile is a glance, desktop is where you work.** Authoring
   (foods/recipes/planning) assumes desktop; day-to-day checking the plan
   and macros assumes a phone in the kitchen.
5. **Placeholders over false precision.** When an ingredient is generic by
   nature (e.g. "vegetables"), the app should say so honestly (0 macros +
   a nudge) rather than inventing a number.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond
standard web practice — single sighted solo user, not a formal requirement
to design against yet.
