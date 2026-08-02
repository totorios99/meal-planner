// Clerk's widgets ship their own palette; this maps them onto Mise's.
//
// Two mechanisms, on purpose:
//
// 1. `variables` below — literal hex, because Clerk derives whole scales (hover, active, alpha
//    shades, the focus ring) from these by parsing the colour. A `var(--token)` can't be parsed
//    at that stage, and the old file passed `var()` under v4 variable names that v7 doesn't even
//    read (`colorText`, `colorTextSecondary`, `colorInputBackground`, `colorInputText`) — which
//    is why the panels rendered stock. These are Mise's *dark* values: the baseline theme.
// 2. The `.cl-*` block in globals.css — the glass surfaces, strokes and ink, which have to
//    follow `[data-theme="light"]` and so must come from tokens at paint time, not from JS.
//
// `cssLayerName` is what makes (2) possible: Clerk's own rules go into `@layer clerk` (declared
// at the top of globals.css), and unlayered CSS always outranks a layer, so our rules win
// without an `!important` arms race.
//
// No `Appearance` annotation: @clerk/types isn't a direct dependency, and the object is checked
// structurally where it's passed to `appearance` anyway.
export const authAppearance = {
  cssLayerName: 'clerk',
  variables: {
    // The darker end of --accent-grad. Every surface Clerk fills with this carries #fff text.
    colorPrimary: '#ab6337',
    colorBackground: '#1b1512',
    colorForeground: '#ffffff',
    colorMutedForeground: 'rgba(255,255,255,.62)',
    colorMuted: 'rgba(255,255,255,.06)',
    colorInput: 'rgba(255,255,255,.06)',
    colorInputForeground: '#ffffff',
    colorBorder: 'rgba(255,255,255,.18)',
    colorNeutral: 'white',
    colorDanger: '#ff7a6b',
    colorWarning: '#ffb84d',
    colorShadow: '#000000',
    borderRadius: '12px',
    fontFamily: 'var(--font-geist-sans)',
    fontFamilyMono: 'var(--font-geist-mono)',
  },
  elements: {
    // Our page already renders the eyebrow + title above the widget.
    header: { display: 'none' },
  },
}
