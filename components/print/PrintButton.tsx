'use client'
import { useEffect } from 'react'
import { Icon } from '@/components/Icon'

export function PrintButton() {
  // Reopened in a browser tab (see handlePrint) — fire the dialog on load.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('print') === '1') {
      window.print()
    }
  }, [])

  function handlePrint() {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone
    // ponytail: iOS home-screen PWA has no working window.print(); break out to a
    // browser tab where it works. Drop this branch if PWA print ever lands.
    if (standalone) {
      window.open(window.location.pathname + '?print=1', '_blank')
    } else {
      window.print()
    }
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={handlePrint}>
      <Icon name="printer" size={14} /> Print
    </button>
  )
}
