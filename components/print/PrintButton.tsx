'use client'
import { Icon } from '@/components/Icon'

export function PrintButton() {
  return (
    <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
      <Icon name="printer" size={14} /> Print
    </button>
  )
}
