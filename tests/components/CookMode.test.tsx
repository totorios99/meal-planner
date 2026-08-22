/**
 * CookMode's timer.
 *
 * It is a wall-clock deadline, not a decrementing counter, and the comment in the source
 * explains why: background tabs throttle intervals to roughly once a minute, so a counter that
 * subtracts per tick finishes a 25-minute simmer late. That design only pays off if the
 * arithmetic around it is right, and the arithmetic has three moving parts — a deadline, a
 * banked `resumeFrom`, and a `runId` that re-arms the effect.
 *
 * This is the one component in the app where a silent regression ruins a meal rather than
 * showing a wrong pixel, which is why it is tested and most components are not.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CookMode } from '@/components/meals/CookMode'
import { SettingsProvider } from '@/lib/SettingsContext'
import { DEFAULTS } from '@/lib/settings'
import type { Stage } from '@/lib/recipe'

// Two slots with different lengths, so "re-armed from the new slot" is distinguishable from
// "carried the previous slot's remainder".
const stages: Stage[] = [
  { name: 'Sear', timing: '5 min', seconds: 300, slot: 0, from: 0, to: 0 },
  { name: 'Rest', timing: '2 min', seconds: 120, slot: 1, from: 0, to: 0 },
]

function setup() {
  return render(
    <SettingsProvider initial={DEFAULTS}>
      <CookMode
        stages={stages}
        ingredients={[{ quantity: 200, unit: 'g', name: 'skirt steak' }]}
        servings={2}
        hero={null}
        head={null}
        list={null}
      />
    </SettingsProvider>
  )
}

/**
 * The countdown. It is a <button>, but carries `role="timer"` so the countdown announces
 * itself — which means it is NOT queryable as a button.
 */
const timer = () => screen.getByRole('timer')
const startCooking = async () => {
  await act(async () => { screen.getByRole('button', { name: /start cooking/i }).click() })
}
/**
 * Move time forward. Under fake timers `Date.now()` is mocked too, so advancing the timers
 * advances the wall clock the component reads — calling setSystemTime as well would count
 * every second twice.
 */
const advance = async (seconds: number) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(seconds * 1000) })
}

beforeEach(() => {
  // No shouldAdvanceTime: the clock must move only when a test says so, or a slow machine
  // leaks real seconds into the assertions.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-22T12:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

it('arms the current slot\'s length when cooking starts', async () => {
  setup()
  await startCooking()
  expect(timer()).toHaveTextContent('5:00')
})

it('counts down against the wall clock', async () => {
  setup()
  await startCooking()
  await advance(60)
  expect(timer()).toHaveTextContent('4:00')
})

it('does not charge the cook for time spent paused', async () => {
  // The property the whole design exists for. Pause banks the remaining seconds; resuming
  // re-arms a fresh deadline from that bank, so a minute spent answering the door does not
  // come out of the simmer.
  setup()
  await startCooking()
  await advance(60)
  expect(timer()).toHaveTextContent('4:00')

  await act(async () => { timer().click() })          // pause
  expect(timer()).toHaveAttribute('aria-label', expect.stringContaining('paused'))

  await advance(120)                                   // two minutes pass, paused
  expect(timer(), 'a paused timer must not move').toHaveTextContent('4:00')

  await act(async () => { timer().click() })          // resume
  expect(timer()).toHaveTextContent('4:00')

  await advance(60)
  expect(timer(), 'and it resumes from the banked value, not the original deadline')
    .toHaveTextContent('3:00')
})

it('clamps at zero instead of going negative', async () => {
  // Math.max(0, …) in the tick. Without it a backgrounded tab that wakes up late would show a
  // negative countdown, which reads as a broken app rather than a finished step.
  setup()
  await startCooking()
  await advance(400)                                   // well past the 300s deadline
  expect(timer()).toHaveTextContent(/time's up/i)
  expect(timer()).toHaveAttribute('aria-label', "Time's up")

  await advance(600)
  expect(timer(), 'still zero, never negative').toHaveTextContent(/time's up/i)
})

it('re-arms from the next slot\'s own length, not the leftover', async () => {
  // goTo() clears resumeFrom and bumps runId. If it did not, stepping on with 4:00 left would
  // give the next step 4:00 instead of its own 2:00.
  setup()
  await startCooking()
  await advance(60)
  expect(timer()).toHaveTextContent('4:00')

  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  })
  expect(timer(), 'slot 1 is 120s of its own').toHaveTextContent('2:00')
})

it('claims Space only when focus is not on a control', async () => {
  // Space is the activation key for whatever button has focus, so claiming it unconditionally
  // would make every button in cook mode also toggle the timer.
  setup()
  await startCooking()
  await advance(60)

  const button = timer()
  button.focus()
  await act(async () => {
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  })
  expect(timer(), 'focus is on a button — Space belongs to it')
    .toHaveAttribute('aria-label', expect.stringContaining('running'))

  await act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  })
  expect(timer(), 'focus is on the page — Space pauses')
    .toHaveAttribute('aria-label', expect.stringContaining('paused'))
})
