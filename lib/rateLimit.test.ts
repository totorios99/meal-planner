// Run: npm test
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { rateLimit, resetRateLimits, tooManyRequests } from './rateLimit.ts'

test('allows up to the limit, then blocks', () => {
  resetRateLimits()
  const t = 1_000_000
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit('a', 5, 60_000, t).ok, true, `request ${i + 1} should pass`)
  }
  assert.equal(rateLimit('a', 5, 60_000, t).ok, false, '6th request should be blocked')
})

test('keys are independent', () => {
  resetRateLimits()
  const t = 1_000_000
  rateLimit('a', 1, 60_000, t)
  assert.equal(rateLimit('a', 1, 60_000, t).ok, false)
  assert.equal(rateLimit('b', 1, 60_000, t).ok, true, 'another caller has its own window')
})

test('window reopens after it expires', () => {
  resetRateLimits()
  const t = 1_000_000
  rateLimit('a', 1, 60_000, t)
  assert.equal(rateLimit('a', 1, 60_000, t + 59_999).ok, false, 'still inside the window')
  assert.equal(rateLimit('a', 1, 60_000, t + 60_000).ok, true, 'window has rolled over')
})

test('retryAfter is a usable Retry-After value', () => {
  resetRateLimits()
  const t = 1_000_000
  rateLimit('a', 1, 60_000, t)
  const blocked = rateLimit('a', 1, 60_000, t + 30_000)
  assert.equal(blocked.ok, false)
  assert.equal(blocked.retryAfter, 30)
  // Never 0, or a client would retry in a tight loop.
  const late = rateLimit('a', 1, 60_000, t + 59_999)
  assert.ok(late.retryAfter >= 1)
})

test('429 carries the Retry-After header', () => {
  const res = tooManyRequests({ ok: false, retryAfter: 42, remaining: 0 })
  assert.equal(res.status, 429)
  assert.equal(res.headers.get('Retry-After'), '42')
})
