interface Props {
  protein: number
  carbs: number
  fats: number
}

export function MacroPie({ protein, carbs, fats }: Props) {
  const p = protein * 4
  const c = carbs * 4
  const f = fats * 9
  const total = p + c + f

  if (total === 0) {
    return (
      <svg viewBox="0 0 36 36" className="w-10 h-10">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
      </svg>
    )
  }

  const pPct = (p / total) * 100
  const cPct = (c / total) * 100
  const fPct = (f / total) * 100

  // offset = circumference * 0.25 to start at 12 o'clock (since SVG starts at 3 o'clock)
  // Each segment's dashOffset is 25 - cumulativeStart
  const segs = [
    { pct: pPct, color: '#3b82f6', start: 0 },
    { pct: cPct, color: '#10b981', start: pPct },
    { pct: fPct, color: '#f59e0b', start: pPct + cPct },
  ]

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
        {segs.map((seg, i) => (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke={seg.color}
            strokeWidth="3.5"
            strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
            strokeDashoffset={25 - seg.start}
          />
        ))}
      </svg>
      <div className="flex gap-2 text-xs">
        <span className="text-blue-500">P {Math.round(pPct)}%</span>
        <span className="text-emerald-500">C {Math.round(cPct)}%</span>
        <span className="text-amber-500">F {Math.round(fPct)}%</span>
      </div>
    </div>
  )
}
