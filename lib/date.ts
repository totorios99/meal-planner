// The server stores weekStart as a UTC timestamp ("2026-07-27T06:00:00.000Z"), so
// `new Date(iso)` renders it in the viewer's zone and can land on the previous day.
// Take the date part only and rebuild it at local midnight — the same trick DayCard
// already used inline. See the timezone section in AGENTS.md.
export function localDate(iso: string, addDays = 0): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d + addDays)
}

// Local midnight of the week containing `from`, per the weekStartsOn preference
// (0 = Sunday, 1 = Monday). `offset` shifts whole weeks.
export function startOfWeek(weekStartsOn: 0 | 1, offset = 0, from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

// Which slot (0..6) of the current week today falls in. Plan days are indexed off weekStart,
// so this moves with the preference too.
export function todayIndex(weekStartsOn: 0 | 1): number {
  return (new Date().getDay() - weekStartsOn + 7) % 7
}

// Day labels come from the actual date, not a Monday-first array — that way they stay
// correct whichever day the week starts on.
export function dayName(date: Date, style: 'short' | 'long' = 'long'): string {
  return date.toLocaleDateString('en-US', { weekday: style })
}

// ponytail: exists so the round-trip (Date -> YYYY-MM-DD -> localDate) is symmetric.
export function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
