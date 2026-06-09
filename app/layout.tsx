import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
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

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Mise — Meal Planner',
  description: 'Your recipes, with macros.',
}

const THEME_SCRIPT = `(function(){
  var p=localStorage.getItem('theme-pref')||localStorage.getItem('theme')||'system';
  if(p==='light'||p==='dark'){
    var dark=p==='dark';
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    if(dark)document.documentElement.classList.add('dark');
  } else {
    var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(dark){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');}
  }
})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="app">
        <Nav />
        {children}
      </body>
    </html>
  )
}
