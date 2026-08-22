/**
 * DayCard's error containment.
 *
 * Both behaviours here exist as scar tissue, recorded in the source comments:
 *
 *   "Without it a 500 put the API's {error: '…'} straight into day state, and the next render
 *    threw on day.meals being undefined — one failed request white-screened the whole planner."
 *
 * That is the failure mode being pinned: not "an error is shown" but "a failed request never
 * reaches day state". A component that shows an error AND corrupts its state has still lost.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DayCard } from '@/components/planner/DayCard'
import { DEFAULTS } from '@/lib/settings'
import type { WeeklyPlanDay } from '@/types'

const day = {
  id: 10,
  weeklyPlanId: 1,
  dayIndex: 0,
  isDismissed: false,
  justification: '',
  meals: [
    {
      id: 99,
      weeklyPlanDayId: 10,
      mealId: 5,
      slotIndex: 0,
      ingredients: '[]',
      meal: {
        id: 5, userId: 'u', title: 'Rice bowl', description: '', tag: '',
        calories: 500, protein: 20, carbs: 60, fats: 10, imageUrl: '',
        ingredients: '[]', steps: '[]', stages: '[]',
        prepMinutes: 0, cookMinutes: 0, servings: 1, isFavorite: false,
        createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
      },
    },
  ],
} as unknown as WeeklyPlanDay

function setup() {
  const onDayUpdate = vi.fn()
  render(
    <DayCard
      day={day}
      planId={1}
      targets={DEFAULTS}
      foods={[]}
      weekStart="2026-08-10"
      onDayUpdate={onDayUpdate}
    />
  )
  return { onDayUpdate }
}

const removeButton = () => screen.getByRole('button', { name: /remove/i })
const clickRemove = async () => { await act(async () => { removeButton().click() }) }

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { vi.unstubAllGlobals() })

it('keeps the meal when the server rejects the delete', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ error: 'Could not remove that meal' }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  )))

  const { onDayUpdate } = setup()
  await clickRemove()

  expect(onDayUpdate, 'a rejected mutation must not reach day state').not.toHaveBeenCalled()
  expect(screen.getByText('Rice bowl'), 'and the meal is still on the board').toBeTruthy()
})

it('surfaces the server\'s own message rather than a generic one', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ error: 'Could not remove that meal' }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  )))

  setup()
  await clickRemove()
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove that meal')
})

it('falls back to a readable message when the body is not JSON', async () => {
  // A 502 from the reverse proxy is HTML, not the API's shape. Reading `.error` off it yields
  // undefined, which must not become the text the user reads.
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })))

  const { onDayUpdate } = setup()
  await clickRemove()

  expect(await screen.findByRole('alert')).toHaveTextContent(/could not save that change/i)
  expect(onDayUpdate).not.toHaveBeenCalled()
})

it('reports a network failure instead of throwing out of the handler', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

  const { onDayUpdate } = setup()
  await clickRemove()

  expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i)
  expect(onDayUpdate).not.toHaveBeenCalled()
  expect(screen.getByText('Rice bowl')).toBeTruthy()
})

it('applies the change only when the server accepted it', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })))

  const { onDayUpdate } = setup()
  await clickRemove()

  expect(onDayUpdate).toHaveBeenCalledTimes(1)
  expect(onDayUpdate.mock.calls[0][0].meals, 'the removed entry is gone from the new day').toHaveLength(0)
  expect(screen.queryByRole('alert'), 'and nothing is reported').toBeNull()
})
