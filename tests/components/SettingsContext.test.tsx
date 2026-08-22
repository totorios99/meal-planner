/**
 * The settings write path — the only place a preference is written (AGENTS.md).
 *
 * Two properties matter, and both are recorded in the source as things that have gone wrong:
 *
 *   `ready` gates the planner. While it is false the app must not act on the preferences it is
 *   holding, because `initial` may be DEFAULTS from a request where auth() came back empty. A
 *   defaulted Monday start made the planner ask for a week that did not exist, and
 *   GET /api/plans/active creates the week it is asked for — an empty plan out of thin air.
 *
 *   `update` is optimistic, so a failed save must put the old value back. A control that stays
 *   flipped after the server refused is lying about what is stored.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { SettingsProvider, useSettings } from '@/lib/SettingsContext'
import { DEFAULTS } from '@/lib/settings'
import type { Settings } from '@/lib/settings'

/** Renders the pieces of context under test as text, so assertions read off the DOM. */
function Probe() {
  const { settings, update, error, ready } = useSettings()
  return (
    <div>
      <span data-testid="calories">{settings.calories}</span>
      <span data-testid="week">{settings.weekStartsOn}</span>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button onClick={() => { void update({ calories: 3000 }) }}>bump</button>
    </div>
  )
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const setup = (initial: Settings = DEFAULTS) =>
  render(<SettingsProvider initial={initial}>{<Probe />}</SettingsProvider>)

const text = (id: string) => screen.getByTestId(id).textContent
const bump = async () => { await act(async () => { screen.getByText('bump').click() }) }

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { vi.unstubAllGlobals() })

it('re-reads the row on mount and reconciles what the server actually has', async () => {
  // `initial` is only as good as the render that produced it — a page restored from a
  // home-screen snapshot carries whatever it was serialised with.
  const stored = { ...DEFAULTS, weekStartsOn: 0 as const, calories: 2100 }
  vi.stubGlobal('fetch', vi.fn(async () => json(stored)))

  setup(DEFAULTS)
  await waitFor(() => expect(text('ready')).toBe('true'))
  expect(text('week'), 'the stored Sunday start wins over the defaulted Monday').toBe('0')
  expect(text('calories')).toBe('2100')
})

it('becomes ready even when every read fails', async () => {
  // A signed-out visitor, or a network that is simply down, must not leave the planner
  // waiting forever. `ready` means "we tried", not "we succeeded".
  vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'Unauthorized' }, 401)))

  setup()
  await waitFor(() => expect(text('ready')).toBe('true'), { timeout: 5000 })
  expect(text('calories'), 'and it keeps the value it was given').toBe(String(DEFAULTS.calories))
})

it('retries a transient read failure before giving up', async () => {
  // A container that has just been recreated — which happens on every deploy — answers for a
  // moment before Clerk is ready. One 401 there was enough to leave the app on DEFAULTS.
  const stored = { ...DEFAULTS, calories: 2222 }
  let calls = 0
  vi.stubGlobal('fetch', vi.fn(async () => {
    calls++
    return calls === 1 ? json({ error: 'Unauthorized' }, 401) : json(stored)
  }))

  setup()
  await waitFor(() => expect(text('calories')).toBe('2222'), { timeout: 5000 })
  expect(calls, 'the first answer was not the final one').toBeGreaterThan(1)
})

it('moves the value immediately, before the save resolves', async () => {
  // Optimistic on purpose: the settings UI autosaves, and a control that waits for a round
  // trip feels broken.
  // Every request hangs until the test releases it, so the assertion lands while the PATCH is
  // genuinely still in flight rather than after it quietly resolved.
  let releasePatch: (r: Response) => void = () => {}
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>(res => { if (init?.method === 'PATCH') releasePatch = res })))

  setup()
  await bump()
  expect(text('calories'), 'the new value is on screen while the request is in flight').toBe('3000')
  await act(async () => { releasePatch(json({ ...DEFAULTS, calories: 3000 })) })
})

it('rolls the value back when the server refuses', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'PATCH' ? json({ error: 'nope' }, 400) : json(DEFAULTS)))

  setup()
  await waitFor(() => expect(text('ready')).toBe('true'))
  await bump()

  await waitFor(() => expect(text('calories'), 'the old value is restored')
    .toBe(String(DEFAULTS.calories)))
  expect(text('error'), 'and the user is told why').toMatch(/couldn't save that \(400\)/i)
})

it('rolls back on a network throw too, and never rejects', async () => {
  // `update` returning false rather than throwing is what lets SettingsForm treat a failure as
  // "flash a warning" instead of an unhandled rejection.
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') throw new TypeError('Failed to fetch')
    return json(DEFAULTS)
  }))

  setup()
  await waitFor(() => expect(text('ready')).toBe('true'))
  await bump()

  await waitFor(() => expect(text('calories')).toBe(String(DEFAULTS.calories)))
  expect(text('error')).toBeTruthy()
})

it('trusts the row the server stored over the optimistic merge', async () => {
  // The server may normalise or clamp what it was sent; what it returns is what is stored.
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'PATCH' ? json({ ...DEFAULTS, calories: 2900 }) : json(DEFAULTS)))

  setup()
  await waitFor(() => expect(text('ready')).toBe('true'))
  await bump()
  await waitFor(() => expect(text('calories'), 'the stored 2900, not the requested 3000')
    .toBe('2900'))
})

it('does not let the mount read undo a save that landed first', async () => {
  // The `saved` ref. Without it the in-flight mount read would overwrite a preference the user
  // changed while it was still resolving.
  let releaseRead: (r: Response) => void = () => {}
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return Promise.resolve(json({ ...DEFAULTS, calories: 3000 }))
    return new Promise<Response>(res => { releaseRead = res })
  }))

  setup()
  await bump()                                     // save completes first
  expect(text('calories')).toBe('3000')

  await act(async () => { releaseRead(json({ ...DEFAULTS, calories: 1000 })) })
  expect(text('calories'), 'the stale read must not win').toBe('3000')
})

it('gives a consumer outside the provider sane defaults rather than crashing', async () => {
  // A portal in a test, or a stray island. ready:true because nothing is coming to confirm.
  render(<Probe />)
  expect(text('calories')).toBe(String(DEFAULTS.calories))
  expect(text('ready')).toBe('true')
})
