# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Multi-user, small-scale: Antonio (the developer) plus anyone he invites —
household-sized, not a public product. Every account is fully isolated: its
own meals, foods, weekly plans and macro targets, with no sharing between
them. Antonio is additionally the *owner* account (`MISE_OWNER_USER_ID`) that
agent imports act on behalf of.

## Product Purpose

Mise is a self-hosted personal meal planner: a cookbook of meals, a
seven-day weekly planner (starting Monday or Sunday, per user), and a
printable weekly reference, all tracking
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
- Daily macro target (calories/protein/carbs/fats) is user-set and stored
  server-side as a per-user `Settings` row; the seed defaults are
  2450 kcal / 160P / 270C / 80F (`DEFAULTS` in `lib/settings.ts`), editable
  per user, not a fixed product value. All preferences — targets, theme,
  units, recipe view, week start, planner density — are edited in one place,
  `/settings`.

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
- Theming: light/dark/system, persisted per user.
- Accounts via Clerk; agents authenticate separately with a shared admin
  secret (`x-mise-admin-secret`) and act as the owner account. Every query is
  scoped by `userId` — isolation is enforced next to the data, not by the
  proxy. See the security requirements in `AGENTS.md`.

## Brand Commitments

Name: **Mise** (from "mise en place"). Clay accent (`--accent` `#c98a63`,
with a deliberately darker `--accent-grad` ramp for surfaces carrying white
text), warm translucent "glass" surfaces over a blurred wallpaper, display
headline pairing — all over CSS custom properties, no Tailwind utility
classes in markup. Full spec in `DESIGN.md`.

## Evidence on Hand

Live production data: ~115 curated foods (many with real product photos) and
~20 recipes, several imported from real TikTok videos via the MCP pipeline.
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
standard web practice. The accent ramp is held to 4.5:1 against white text
(see `DESIGN.md`) and controls carry `role`/`aria-checked`, but nothing has
been formally audited or designed against yet.
