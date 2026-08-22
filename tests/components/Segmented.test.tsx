/**
 * Segmented's keyboard contract.
 *
 * `role="radiogroup"` is a promise: one tab stop for the whole group, arrows to move within it
 * (ARIA APG). The component's own comment records that the hand-rolled copies this replaced
 * shipped N tab stops and dead arrow keys — an a11y contract with a known regression is exactly
 * the kind of seam worth pinning.
 *
 * The sliding thumb is deliberately untested: it is measured from live layout, which happy-dom
 * reports as zero, and its failure mode is visual rather than functional.
 */
import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Segmented } from '@/components/Segmented'

const OPTIONS = [
  { value: 'chart', label: 'Chart' },
  { value: 'list', label: 'List' },
  { value: 'both', label: 'Both' },
]

function setup(value = 'chart') {
  const onPick = vi.fn()
  render(<Segmented label="Recipe view" value={value} options={OPTIONS} onPick={onPick} />)
  return { onPick, group: screen.getByRole('radiogroup', { name: 'Recipe view' }) }
}

const radios = () => screen.getAllByRole('radio')
const key = (el: Element, k: string) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
  el.dispatchEvent(ev)
  return ev
}

it('exposes one tab stop, on the selected option', () => {
  // The whole point of a radiogroup: Tab reaches the group once, not once per option.
  setup('list')
  const tabbable = radios().filter(r => r.getAttribute('tabindex') === '0')
  expect(tabbable, 'exactly one member is tabbable').toHaveLength(1)
  expect(tabbable[0]).toHaveTextContent('List')
  expect(radios().filter(r => r.getAttribute('tabindex') === '-1')).toHaveLength(2)
})

it('marks exactly one option checked', () => {
  setup('list')
  expect(radios().filter(r => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  expect(screen.getByRole('radio', { checked: true })).toHaveTextContent('List')
})

it('moves selection with the arrow keys, both axes', () => {
  // Down/Up are part of the APG pattern too — a vertical group is the same widget.
  const { onPick, group } = setup('chart')
  key(group, 'ArrowRight')
  expect(onPick).toHaveBeenLastCalledWith('list')

  key(group, 'ArrowDown')
  expect(onPick, 'Down behaves as Right').toHaveBeenLastCalledWith('list')

  key(group, 'ArrowLeft')
  expect(onPick).toHaveBeenLastCalledWith('both')   // wraps backwards from the first
})

// Two renders in one test would leave two radiogroups in the document, so each end gets its own.
it('wraps past the last option back to the first', () => {
  const { onPick, group } = setup('both')
  key(group, 'ArrowRight')
  expect(onPick).toHaveBeenLastCalledWith('chart')
})

it('wraps before the first option round to the last', () => {
  const { onPick, group } = setup('chart')
  key(group, 'ArrowLeft')
  expect(onPick).toHaveBeenLastCalledWith('both')
})

it('jumps to the ends with Home and End', () => {
  const { onPick, group } = setup('list')
  key(group, 'Home')
  expect(onPick).toHaveBeenLastCalledWith('chart')
  key(group, 'End')
  expect(onPick).toHaveBeenLastCalledWith('both')
})

it('moves focus with the selection, not just the value', () => {
  // Roving tabindex is only half the pattern — the focus has to follow, or the next arrow key
  // goes to whatever the browser still thinks is focused.
  const { group } = setup('chart')
  key(group, 'ArrowRight')
  expect(document.activeElement).toHaveTextContent('List')
})

it('leaves other keys to the browser', () => {
  // preventDefault on anything unhandled would swallow Tab and trap focus in the group.
  const { onPick, group } = setup('chart')
  const tab = key(group, 'Tab')
  expect(tab.defaultPrevented, 'Tab must still leave the group').toBe(false)
  expect(onPick).not.toHaveBeenCalled()
})

it('keeps a focusable member when the value matches nothing', () => {
  // A stale saved preference, or a servings count outside the offered steps. Without the
  // fallback every option would be tabindex=-1 and the group would be unreachable.
  setup('something-else-entirely')
  const tabbable = radios().filter(r => r.getAttribute('tabindex') === '0')
  expect(tabbable, 'falls back to the first option').toHaveLength(1)
  expect(tabbable[0]).toHaveTextContent('Chart')
  expect(screen.queryByRole('radio', { checked: true }), 'but nothing is checked').toBeNull()
})
