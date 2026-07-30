import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Oswald } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-wallpaper="mist"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=document.documentElement;var p=localStorage.getItem('theme-pref')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);e.setAttribute('data-theme',d?'dark':'light');e.classList.toggle('dark',d);var v=localStorage.getItem('meal-planner-recipe-view');if(v==='list'||v==='chart')e.setAttribute('data-recipe-view',v);}catch(_){}})();`,
          }}
        />
      </head>
      <body className="app">
        <div className="wallpaper" />
        <Nav />
        {children}
      </body>
    </html>
  )
}
