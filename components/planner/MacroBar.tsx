interface Props {
  label: string
  value: number
  target: number
  color: string // tailwind bg color class like 'bg-blue-500'
  unit?: string
}

export function MacroBar({ label, value, target, color, unit = 'g' }: Props) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : color

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>{Math.round(value)}/{target}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
