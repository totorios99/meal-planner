import assert from 'node:assert/strict'
import { weekLabel, localDate, startOfWeek } from './date'

// The week on screen. Sunday 9 Aug 2026, matching a weekStartsOn: 0 user.
const viewingSun = localDate('2026-08-09')

// The near past gets named, not dated — that's the whole point of the labels.
assert.equal(weekLabel('2026-08-02', viewingSun, 0), 'Last week')
assert.equal(weekLabel('2026-07-26', viewingSun, 0), 'Two weeks ago')
assert.equal(weekLabel('2026-07-19', viewingSun, 0), 'Week of Jul 19')

// The regression this was written for: a plan stored under a Monday start, read by a user who
// now starts weeks on Sunday. Monday 3 Aug belongs to the week of Sunday 2 Aug — which, from the
// week of the 9th, is last week. Printing the stored date said "Week of Aug 3" instead.
assert.equal(weekLabel('2026-08-03', viewingSun, 0), 'Last week')

// And the mirror: a Sunday-stored plan read by a Monday-start user. Sunday 2 Aug falls inside the
// week beginning Monday 27 Jul, two weeks back from the week of Monday 10 Aug.
const viewingMon = localDate('2026-08-10')
assert.equal(weekLabel('2026-08-02', viewingMon, 1), 'Two weeks ago')
assert.equal(weekLabel('2026-08-03', viewingMon, 1), 'Last week')

// The year only appears when it differs — "Week of Dec 28, 2025" is worth the extra width,
// "Week of Jul 19, 2026" next to a 2026 week is noise.
assert.equal(weekLabel('2025-12-28', viewingSun, 0), 'Week of Dec 28, 2025')
assert.match(weekLabel('2026-07-19', viewingSun, 0), /^Week of Jul 19$/)

// The label is relative to the week being *viewed*, not to today: paging back a week has to move
// "Last week" with it, or the list contradicts the board beside it.
assert.equal(weekLabel('2026-07-26', localDate('2026-08-02'), 0), 'Last week')

// A DST boundary must not round a week into the wrong bucket. US DST ends 1 Nov 2026, so the
// weeks either side of it are 167 and 169 hours apart in local time rather than 168.
const afterDst = localDate('2026-11-08')
assert.equal(weekLabel('2026-11-01', afterDst, 0), 'Last week')
assert.equal(weekLabel('2026-10-25', afterDst, 0), 'Two weeks ago')

// startOfWeek is what does the snapping, so pin the boundary it hinges on: a day that is a week
// start under one preference and mid-week under the other.
assert.equal(startOfWeek(0, 0, localDate('2026-08-03')).getDate(), 2, 'Mon Aug 3 sits in the Sunday week of Aug 2')
assert.equal(startOfWeek(1, 0, localDate('2026-08-03')).getDate(), 3, 'Mon Aug 3 starts its own Monday week')

console.log('weekLabel / startOfWeek snapping: all checks passed')
