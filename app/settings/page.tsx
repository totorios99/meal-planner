import { SettingsForm } from '@/components/settings/SettingsForm'

export const dynamic = 'force-dynamic'

// The values themselves come from the provider in app/layout.tsx, which already read the row
// for this request — no second query here.
export default function SettingsPage() {
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-eyebrow">Preferences</div>
          <h1 className="page-title">Your <em>settings.</em></h1>
          <p className="home-sub">Saved to the app, not this browser — every device sees the same.</p>
        </div>
      </div>
      <SettingsForm />
    </main>
  )
}
