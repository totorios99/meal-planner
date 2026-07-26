// The server stores weekStart as a UTC timestamp ("2026-07-27T06:00:00.000Z"), so
// `new Date(iso)` renders it in the viewer's zone and can land on the previous day.
// Take the date part only and rebuild it at local midnight — the same trick DayCard
// already used inline. See the timezone section in AGENTS.md.
export function localDate(iso: string, addDays = 0): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d + addDays)
}

// ponytail: exists so the round-trip (Date -> YYYY-MM-DD -> localDate) is symmetric.
export function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
