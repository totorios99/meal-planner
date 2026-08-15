'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Icon } from '@/components/Icon'
import { authAppearance } from '@/lib/clerkAppearance'
import { useSettings } from '@/lib/SettingsContext'
import { startOfWeek, toDateParam } from '@/lib/date'
import type { ThemePref } from '@/lib/settings'

const LINKS = [
  { href: '/',        label: 'Home',     icon: 'home'     },
  { href: '/meals',   label: 'Cookbook', icon: 'book'     },
  { href: '/foods',   label: 'Foods',    icon: 'flame'    },
  { href: '/planner', label: 'Planner',  icon: 'calendar' },
  { href: '/print',   label: 'Print',    icon: 'printer'  },
]

// The stylesheet keys off `data-theme` / `.dark` on <html>; the nav is what moves them once
// the page is live (app/layout.tsx stamps them for the first paint).
function applyTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.documentElement.classList.toggle('dark', dark)
}

// matchMedia is external state, so it's subscribed to rather than mirrored into an effect —
// no setState-in-effect, and no render where the icon is wrong.
const systemDarkStore = {
  subscribe(cb: () => void) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  },
  get: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  // On the server the preference is unknowable; light matches what layout.tsx renders, and the
  // pre-paint script has already corrected the document by the time this hydrates.
  getServer: () => false,
}

export function Nav() {
  const pathname = usePathname()
  const { settings, update } = useSettings()
  // /print takes the week as a param — the server is UTC and can't work out which week the
  // reader means. Every link that goes there carries the browser's answer.
  const printHref = `/print?weekStart=${toDateParam(startOfWeek(settings.weekStartsOn))}`
  const hrefFor = (href: string) => (href === '/print' ? printHref : href)
  const themePref = settings.theme
  const systemDark = useSyncExternalStore(
    systemDarkStore.subscribe,
    systemDarkStore.get,
    systemDarkStore.getServer
  )
  const resolvedDark = themePref === 'dark' || (themePref === 'system' && systemDark)

  // Push the resolved value at the document. Not derivable by CSS alone: `system` has to beat
  // a previously-stamped explicit theme, and the class is what the rest of the app reads.
  useEffect(() => { applyTheme(resolvedDark) }, [resolvedDark])

  function toggleTheme() {
    let next: ThemePref
    if (themePref === 'system') {
      next = resolvedDark ? 'light' : 'dark'
    } else if (themePref === 'dark') {
      next = 'light'
    } else {
      next = 'system'
    }
    void update({ theme: next })
  }

  const themeTitle =
    themePref === 'system'
      ? 'Following system — click to override'
      : themePref === 'dark'
      ? 'Dark — click for light'
      : 'Light — click for auto'

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">M</span>
            Mise
          </Link>

          <div className="nav-links">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={hrefFor(l.href)}
                className={`nav-link ${pathname === l.href ? 'active' : ''}`}
              >
                <Icon name={l.icon} size={15} />
                {l.label}
              </Link>
            ))}
          </div>

          <div className="nav-spacer" />

          <div className="nav-actions">
            {/* No gear here: preferences live inside the profile now, so the avatar is the one
                way in. Two entries to the same screen is what this merge was meant to remove. */}
            <button className="icon-btn" title={themeTitle} onClick={toggleTheme}>
              <Icon name={resolvedDark ? 'sun' : 'moon'} size={17} />
              {themePref === 'system' && <span className="auto-dot" />}
            </button>
            {/* Sized to match .icon-btn so the row doesn't jump when Clerk hydrates. */}
            {/* "Manage account" navigates to /settings rather than opening a modal: preferences
                and account management are one screen now, and a modal copy would be a second
                home for the same controls. */}
            <UserButton
              userProfileMode="navigation"
              userProfileUrl="/settings"
              appearance={{
                ...authAppearance,
                elements: { ...authAppearance.elements, avatarBox: { width: 26, height: 26 } },
              }}
            />
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar">
        {LINKS.map(l => (
          <Link
            key={l.href}
            href={hrefFor(l.href)}
            className={`tab ${pathname === l.href ? 'active' : ''}`}
          >
            <Icon name={l.icon} size={20} />
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
