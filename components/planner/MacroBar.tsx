interface Props {
  label: string
  value: number
  target: number
  color: string // tailwind bg color class like 'bg-blue-500'
  unit?: string
}

export function MacroBar({ label, value, target, color, unit = 'g' }: Props) {
  const rawPct = target > 0 ? (value / target) * 100 : 0
  const clampedPct = Math.min(rawPct, 100)
  const barColor = rawPct >= 100 ? 'bg-red-500' : rawPct >= 70 ? 'bg-yellow-400' : color
  const pctLabel = target > 0 ? `${Math.round(rawPct)}%` : '—'

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className={rawPct >= 100 ? 'text-red-500 font-medium' : rawPct >= 70 ? 'text-yellow-600' : ''}>
          {pctLabel}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  )
}
