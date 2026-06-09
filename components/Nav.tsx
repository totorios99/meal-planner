'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'

const LINKS = [
  { href: '/',        label: 'Home',     icon: 'home'     },
  { href: '/meals',   label: 'Cookbook', icon: 'book'     },
  { href: '/planner', label: 'Planner',  icon: 'calendar' },
  { href: '/print',   label: 'Print',    icon: 'printer'  },
]

type ThemePref = 'system' | 'light' | 'dark'

function applyTheme(pref: ThemePref): boolean {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.documentElement.classList.toggle('dark', dark)
  return dark
}

export function Nav() {
  const pathname = usePathname()
  const [themePref, setThemePref] = useState<ThemePref>('system')
  const [resolvedDark, setResolvedDark] = useState(false)

  useEffect(() => {
    const stored = (localStorage.getItem('theme-pref') ?? 'system') as ThemePref
    setThemePref(stored)
    setResolvedDark(applyTheme(stored))
  }, [])

  useEffect(() => {
    if (themePref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setResolvedDark(applyTheme('system'))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themePref])

  function toggleTheme() {
    let next: ThemePref
    if (themePref === 'system') {
      next = resolvedDark ? 'light' : 'dark'
    } else if (themePref === 'dark') {
      next = 'light'
    } else {
      next = 'system'
    }
    setThemePref(next)
    if (next === 'system') {
      localStorage.removeItem('theme-pref')
    } else {
      localStorage.setItem('theme-pref', next)
    }
    setResolvedDark(applyTheme(next))
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
                href={l.href}
                className={`nav-link ${pathname === l.href ? 'active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="nav-spacer" />

          <div className="nav-actions">
            <button className="icon-btn" title={themeTitle} onClick={toggleTheme}>
              <Icon name={resolvedDark ? 'sun' : 'moon'} size={17} />
              {themePref === 'system' && <span className="auto-dot" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar">
        {LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
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
