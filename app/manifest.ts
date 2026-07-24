import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mise — Meal Planner',
    short_name: 'Mise',
    description: 'Your recipes, with macros.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1318',
    theme_color: '#c17a52',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
