'use client'
import { UserProfile } from '@clerk/nextjs'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { Icon } from '@/components/Icon'
import { profileAppearance } from '@/lib/clerkAppearance'

// Preferences and account management in one screen: Clerk's UserProfile owns the shell, and our
// settings ride in it as a custom page. The form is unchanged — it still writes through
// SettingsContext to PATCH /api/settings, so /settings remains the only place a preference is
// written (AGENTS.md). Clerk renders nothing here that touches authorization; the profile widget
// talks to Clerk's own backend with the session it already has.
//
// routing="hash": this is a plain /settings route, not a catch-all, so the widget's internal
// navigation has to live in the fragment. A path-based UserProfile would need
// app/settings/[[...rest]]/page.tsx instead.
//
// The two bare <Page> markers reorder Clerk's built-ins: without them, custom pages are appended
// after Account and Security, and preferences are what this route is for.
export function SettingsPanel() {
  return (
    <div className="settings-panel">
      <UserProfile routing="hash" appearance={profileAppearance}>
        <UserProfile.Page
          label="Preferences"
          url="preferences"
          labelIcon={<Icon name="settings" size={16} />}
        >
          <SettingsForm />
        </UserProfile.Page>
        <UserProfile.Page label="account" />
        <UserProfile.Page label="security" />
      </UserProfile>
    </div>
  )
}
