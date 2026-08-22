// slugify is where a human's label and an agent's label have to converge on the same machine
// key. Two writers, one key — if they diverge, a food ends up with "Vitamin C" and "vitamin_c"
// as separate nutrients and the totals silently double-count.
import { it } from 'vitest'
import assert from 'node:assert/strict'
import { slugify } from './slugify.ts'

it('converges the shapes a human and an agent each type', () => {
  assert.equal(slugify('Vitamin C'), 'vitamin_c')
  assert.equal(slugify('vitamin c'), 'vitamin_c', 'casing must not fork the key')
  assert.equal(slugify('  Vitamin  C  '), 'vitamin_c', 'stray whitespace must not fork the key')
  assert.equal(slugify('Vitamin-C'), 'vitamin_c', 'a hyphen and a space are the same separator')
})

it('collapses any run of separators to a single underscore', () => {
  assert.equal(slugify('Total Sugars, added'), 'total_sugars_added')
  assert.equal(slugify('Omega-3 / Omega-6'), 'omega_3_omega_6')
})

it('never leaves a leading or trailing underscore', () => {
  // A key with an edge underscore reads as a different key to a Set, so the duplicate check
  // in foodSchema would let "_iron" and "iron" both through.
  assert.equal(slugify('(Iron)'), 'iron')
  assert.equal(slugify('%DV Iron%'), 'dv_iron')
  assert.equal(slugify('...sodium...'), 'sodium')
})

it('returns empty for a label with nothing to key on', () => {
  // foodSchema depends on this exact result: it is the signal that rejects the entry rather
  // than saving a key parseNutrients would later drop on the floor.
  assert.equal(slugify('%'), '', 'punctuation-only slugifies to empty')
  assert.equal(slugify('---'), '')
  assert.equal(slugify('(%)'), '')
  // But a label only *mostly* punctuation still keys fine — "%DV" has two letters in it.
  assert.equal(slugify('%DV'), 'dv', 'letters survive surrounding punctuation')
  assert.equal(slugify(''), '')
  assert.equal(slugify('   '), '')
})

it('keeps digits, which several real nutrient names need', () => {
  assert.equal(slugify('Vitamin B12'), 'vitamin_b12')
  assert.equal(slugify('Omega 3'), 'omega_3')
})
