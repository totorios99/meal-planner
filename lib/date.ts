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

// How a past week is named in a list of weeks to copy from. Two things were wrong with printing
// the stored date:
//
// It isn't the date the user thinks in. weekStart is whatever the week started on when the plan
// was made, so a week planned under a Monday start reads as "Aug 3" to someone now on Sunday
// weeks — a day that, to them, sits in the middle of the week of Aug 2. Snap every plan onto the
// current preference's grid first and the labels line up with the weeks the planner shows.
//
// And a date is the wrong unit for the near past. The week you almost always want is the one just
// gone, so name it: scanning "Last week" is instant, working out whether Aug 9 was last week or
// the one before is not. `viewing` is the week on screen, which is not always the current one —
// paging back a week makes the week before *that* the one called "Last week".
export function weekLabel(planWeekStart: string, viewing: Date, weekStartsOn: 0 | 1): string {
  const week = startOfWeek(weekStartsOn, 0, localDate(planWeekStart))
  // Both ends are local midnight on the same weekday, so a DST change can shift the difference
  // by an hour either way — round rather than floor, or the week after a change comes out short.
  const back = Math.round((viewing.getTime() - week.getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (back === 1) return 'Last week'
  if (back === 2) return 'Two weeks ago'
  const sameYear = week.getFullYear() === viewing.getFullYear()
  return `Week of ${week.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })}`
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
