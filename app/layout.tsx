import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono, Oswald } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'
import { getSettings } from '@/lib/settings.server'
import { SettingsProvider } from '@/lib/SettingsContext'

// Preferences now live in the DB, so the shell is per-request rather than prerendered.
export const dynamic = 'force-dynamic'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Condensed grotesque for the nutrition-facts panel — matches the dense,
// bold, all-caps look of NOM-051 "Declaración Nutrimental" labels.
const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mise — Meal Planner',
  description: 'Your recipes, with macros.',
  // orange dev favicon so dev/prod tabs are distinguishable
  icons: {
    icon: process.env.NODE_ENV === 'development' ? '/favicon-dev.ico' : '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mise',
  },
}

// resizes-content: on-screen keyboard shrinks the layout viewport instead of
// overlaying it, so bottom-anchored sheets (e.g. the meal picker) sit above
// the keyboard rather than behind it.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  // The stylesheet already positions the tab bar, sheets and page padding off
  // env(safe-area-inset-*), but those only resolve to real values under
  // viewport-fit: cover — without it iOS insets the viewport itself and every
  // env() reads 0, so the tab bar sat in the home-indicator strip once the app
  // was installed to the Home Screen.
  viewportFit: 'cover',
  themeColor: '#c17a52',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const settings = await getSettings()

  return (
    <ClerkProvider>
    <html
      lang="en"
      suppressHydrationWarning
      data-wallpaper="mist"
      // Stamped server-side so the chart/list rule in globals.css is already correct on the
      // first paint — no script, no flash. Units aren't here: nothing styles off them, cook
      // mode reads them through SettingsContext.
      data-theme-pref={settings.theme}
      data-recipe-view={settings.recipeView}
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable}`}
    >
      <head>
        {/* The one thing the server can't know: how 'system' resolves on this device. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=document.documentElement;var p=e.getAttribute('data-theme-pref')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);e.setAttribute('data-theme',d?'dark':'light');e.classList.toggle('dark',d);}catch(_){}})();`,
          }}
        />
      </head>
      <body className="app">
        <div className="wallpaper" />
        <SettingsProvider initial={settings}>
          <Nav />
          {children}
        </SettingsProvider>
      </body>
    </html>
    </ClerkProvider>
  )
}
