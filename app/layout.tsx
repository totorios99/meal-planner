import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Mise — Meal Planner',
  description: 'Your recipes, with macros.',
}

// resizes-content: on-screen keyboard shrinks the layout viewport instead of
// overlaying it, so bottom-anchored sheets (e.g. the meal picker) sit above
// the keyboard rather than behind it.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('theme-pref')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.setAttribute('data-theme',d?'dark':'light');e.classList.toggle('dark',d);}catch(_){}})();`,
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
