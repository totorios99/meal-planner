import { MacroTargets } from '@/lib/useMacroTargets'

interface Totals { calories: number; protein: number; carbs: number; fats: number }
interface Props { totals: Totals; targets: MacroTargets }

const MACROS = [
  { key: 'calories' as const, label: 'kcal', color: 'var(--kcal)',    unit: ''  },
  { key: 'protein'  as const, label: 'P',    color: 'var(--protein)', unit: 'g' },
  { key: 'carbs'    as const, label: 'C',    color: 'var(--carbs)',   unit: 'g' },
  { key: 'fats'     as const, label: 'F',    color: 'var(--fats)',    unit: 'g' },
]

export function DayAnalytics({ totals, targets }: Props) {
  return (
    <div className="day-totals">
      {MACROS.map(m => {
        const val = Math.round(totals[m.key])
        const tgt = targets[m.key]
        const over = val > tgt
        return (
          <div key={m.key} className="day-total">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0, display: 'inline-block' }} />
            <span className="day-total-label">{m.label}</span>
            <span className={`day-total-val${over ? ' over' : ''}`}>
              {val}/{tgt}{m.unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
