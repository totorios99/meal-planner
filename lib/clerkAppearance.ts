// Clerk's widgets ship their own palette; these map them onto Mise's tokens so sign-in doesn't
// look bolted on, and so they follow the theme toggle for free (the tokens are redefined under
// [data-theme="dark"] in globals.css).
//
// No `Appearance` annotation: @clerk/types isn't a direct dependency, and the object is checked
// structurally where it's passed to `appearance` anyway.
export const authAppearance = {
  variables: {
    colorPrimary: 'var(--accent)',
    colorBackground: 'var(--bg-elev)',
    colorText: 'var(--ink)',
    colorTextSecondary: 'var(--ink-3)',
    colorInputBackground: 'var(--bg-sunken)',
    colorInputText: 'var(--ink)',
    colorDanger: 'var(--danger)',
    borderRadius: '12px',
    fontFamily: 'var(--font-geist-sans)',
  },
  elements: {
    // Our page already renders the eyebrow + title above the widget.
    header: { display: 'none' },
    cardBox: { boxShadow: 'none', border: '1px solid var(--line)' },
    card: { background: 'transparent', boxShadow: 'none' },
  },
}
