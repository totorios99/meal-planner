interface Props {
  calories: number
  protein: number
  carbs: number
  fats: number
}

const MACROS = [
  { key: 'protein', label: 'Protein', abbr: 'P', color: 'var(--protein)' },
  { key: 'carbs', label: 'Carbs', abbr: 'C', color: 'var(--carbs)' },
  { key: 'fats', label: 'Fats', abbr: 'F', color: 'var(--fats)' },
] as const

export function MacroRow(macros: Props) {
  return (
    <div className="macro-row">
      <div className="macro-chip">
        <span className="macro-chip-label">kcal</span>
        <span className="macro-chip-value num">{Math.round(macros.calories)}</span>
      </div>
      {MACROS.map(m => (
        <div key={m.key} className="macro-chip">
          <span className="macro-chip-label">
            <span className="macro-dot" style={{ background: m.color, marginRight: 4 }} />
            <span className="macro-full">{m.label}</span><span className="macro-abbr">{m.abbr}</span>
          </span>
          <span className="macro-chip-value num">
            {Math.round(macros[m.key])}<span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 1 }}>g</span>
          </span>
        </div>
      ))}
    </div>
  )
}
