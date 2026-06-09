interface IconProps {
  name: string
  size?: number
  className?: string
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }
  switch (name) {
    case 'moon':   return <svg {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/></svg>
    case 'sun':    return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    case 'plus':   return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>
    case 'minus':  return <svg {...props}><path d="M5 12h14"/></svg>
    case 'x':      return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>
    case 'edit':   return <svg {...props}><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
    case 'trash':  return <svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
    case 'chev-left':  return <svg {...props}><path d="m15 18-6-6 6-6"/></svg>
    case 'chev-right': return <svg {...props}><path d="m9 18 6-6-6-6"/></svg>
    case 'chev-down':  return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>
    case 'settings':   return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
    case 'printer':    return <svg {...props}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
    case 'calendar':   return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    case 'book':       return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>
    case 'home':       return <svg {...props}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>
    case 'flame':      return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a7 7 0 0 0 7-7c0-4-2-5-3-7-3 3-3 5-3 7a3 3 0 0 1-3 3 3 3 0 0 1-3-3c0-1 1-3 1-3-2 2-3 4-3 6.5A6.5 6.5 0 0 0 11 21a6.5 6.5 0 0 0 6.5-6.5"/></svg>
    case 'trip':       return <svg {...props}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8l-8.2-1.8L3 8l8 5-3 3-3-1-1 1 4 2 2 4 1-1-1-3 3-3 5 8z"/></svg>
    case 'sparkle':    return <svg {...props}><path d="M12 3v6m0 6v6M3 12h6m6 0h6"/></svg>
    case 'arrow-right':return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
    case 'check':      return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>
    default: return null
  }
}
