# Design system — Mise

Everything here is derived from `app/globals.css`. That file is the source of truth; this
document explains it. If the two disagree, the CSS is right and this needs fixing.

## The one hard rule

**CSS custom properties only. No Tailwind utility classes in component markup.** Components
carry semantic class names (`.recipe-panel`, `.cook-seg`, `.page-title`) whose styling lives in
`globals.css` and reads from the tokens below. Inline `style={{}}` is acceptable for one-off
layout (a flex gap, a max-width), never for colour.

## Theming model

This is the opposite of the usual arrangement, so read it before touching colour:

- **`:root` *is* the dark theme** (`color-scheme: dark`). Dark is the baseline, not the
  override.
- **`[data-theme="light"]` overrides it** (`app/globals.css:443`), redefining the wallpaper
  ramp, glass fills, strokes and ink. A handful of components have their own `[data-theme=...]`
  rules where a straight token swap isn't enough — e.g. `.print-paper`, which stays paper-white
  in both themes.

The attribute is set in three places, in this order:

1. **Server** — `app/layout.tsx` stamps `data-theme-pref` and `data-recipe-view` on `<html>`
   from the user's saved `Settings` row. No flash, no client round-trip.
2. **Pre-paint inline script** — also in `app/layout.tsx`, resolves `system` against
   `matchMedia('(prefers-color-scheme: dark)')` and sets `data-theme` + the `.dark` class. This
   is the one thing the server can't know.
3. **Client** — `stamp()` in `lib/SettingsContext.tsx` re-applies all of the above whenever
   settings change, and `components/Nav.tsx` keeps a `useSyncExternalStore` on the OS
   preference so a mid-session light/dark switch still lands while `theme` is `system`.

Never swap themes in a `useEffect` off state alone — that reintroduces the flash all of the
above exists to avoid.

## Tokens

### Type

| Token | Use |
|---|---|
| `--sans` | Geist Sans → system stack. Body copy, UI. |
| `--display` | Geist Sans at display sizes. Page titles. |
| `--mono` | Geist Mono. Numerics where alignment matters. |
| `--condensed` | Oswald. The nutrition-facts panel only — matches the dense all-caps look of NOM-051 "Declaración Nutrimental" labels. |

### Surfaces — "glass"

Panels are translucent gradients over a blurred wallpaper, not flat fills.

`--wp-a` … `--wp-e` + `--wp-base` (wallpaper ramp) · `--glass-blur` (28px) · `--panel`,
`--panel-2` (panel gradients) · `--glass-fill`, `--glass-fill-2` (interactive surfaces) ·
`--stroke`, `--stroke-hi`, `--hair` (borders) · `--well` (recessed input, flips in light) ·
`--shadow-glass`, `--inset-hi`.

Legacy aliases still referenced by components that predate the glass pass: `--bg`, `--bg-elev`,
`--bg-sunken`, `--line`, `--line-strong`, and `--label-paper` (opaque stock for
`.nutrition-card`, which cannot be translucent).

### Ink

`--ink` `#ffffff` → `--ink-2` `.84` → `--ink-3` `.62` → `--ink-4` `.40`. Descending emphasis:
body, secondary, meta/labels, disabled.

### Accent — clay

```
--accent:      #c98a63   /* borders, dots, accent text — never reversed out in white */
--accent-2:    #d6a07f
--accent-grad: linear-gradient(140deg, #ab6337, #945537)
--accent-soft: rgba(201,138,99,.15)
--accent-ink:  #eccfba
```

`--accent-grad` is deliberately darker than `--accent`. Every surface that uses the ramp carries
`#fff` text (primary button, active chip, brand mark, quick-action tile); the previous stops
(`#cf9069` → `#bd734f`) put that text at 2.68–3.67:1. These clear 4.5:1 (4.59 and 5.81) at the
same hue and the same light→dark direction. **Don't "fix" the gradient back to match `--accent`.**

### Macros

`--kcal` `#ffffff` · `--protein` `#8ba6c6` · `--carbs` `#c9aa74` · `--fats` `#bf8aa8`

These are load-bearing: the same three hues identify protein/carbs/fats in the macro ring, the
day analytics bars, the nutrition label and the print view. Changing one means changing it
everywhere at once.

### States and shape

`--warn` / `--warn-soft` · `--danger` · `--off` / `--off-soft` · `--track` (empty progress).

`--r-sm` 12 · `--r-md` 18 · `--r-lg` 24 · `--r-xl` 30 · `--r-pill` 999.

## Patterns

**Page header** — the trio every top-level page opens with:

```
.page-eyebrow   12px uppercase label
.page-title     display font, 46px, with a gradient <em> for the emphasised word
.home-sub       15px, --ink-3   (planner/foods use .page-sub)
```

Steps down to 32px at tablet and 28px at phone (`globals.css:2352`, `:2468`).

**Segmented control** — `.cook-seg-pills` wrapping `.cook-seg` buttons, `.is-on` for the
selected one, `role="radiogroup"` + `aria-checked` on each. This is the shared primitive behind
CookMode's Serves/Units rows, the recipe Cook/List switch, and every toggle in the settings
panel. Reuse it rather than inventing another toggle shape.

**Where preferences are edited** — `/settings` (`components/settings/SettingsForm.tsx`) is the
only place a preference is *written*. In-flow controls (recipe Cook/List, CookMode units) are
session-local: they're seeded from the saved default and never persist. Don't add a control
elsewhere that writes to `Settings`; the one exception is the Nav theme toggle, which is a
standard piece of app chrome.

## Responsive

Mobile is a glance, desktop is where you work. Nav is a desktop icon+label bar, a mobile top
pill (brand only), and a bottom tab bar. Safe-area insets are live — `viewport-fit: cover` is
set in `app/layout.tsx`, so every dormant `env(safe-area-inset-*)` rule resolves; the tab bar
uses `max()`, not a sum, so it doesn't double-pad.
