'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '0.5rem 1.5rem',
        background: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
      }}
    >
      Print
    </button>
  )
}
