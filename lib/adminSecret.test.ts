// The agent trust boundary, tested in isolation — this module has no Next and no Clerk
// imports, so it runs in a bare node environment while the routes that use it cannot.
//
// AGENTS.md rules 2-5 all land here: header only, never a query string, timingSafeEqual
// rather than !==, and unset means OFF rather than open.
import { afterEach, beforeEach, it } from 'vitest'
import assert from 'node:assert/strict'
import { ADMIN_HEADER, checkAdminSecret } from './adminSecret.ts'

const SECRET = 'a-real-looking-secret-0123456789'
let saved: string | undefined

beforeEach(() => {
  saved = process.env.MISE_ADMIN_SECRET
  process.env.MISE_ADMIN_SECRET = SECRET
})
afterEach(() => {
  if (saved === undefined) delete process.env.MISE_ADMIN_SECRET
  else process.env.MISE_ADMIN_SECRET = saved
})

const withHeader = (value: string) =>
  new Request('https://mise.test/api/meals/import', { headers: { [ADMIN_HEADER]: value } })

it('accepts the exact secret and nothing else', () => {
  assert.equal(checkAdminSecret(withHeader(SECRET)), 'valid')
  assert.equal(checkAdminSecret(withHeader(SECRET.toUpperCase())), 'invalid', 'comparison is case-sensitive')
  // Surrounding whitespace is stripped by the Headers API itself, per the Fetch spec, before
  // this module ever sees the value — so a padded secret is the same secret. That is HTTP
  // behaving normally, not a weak comparison; the bytes compared here are already normalized.
  assert.equal(checkAdminSecret(withHeader(` ${SECRET} `)), 'valid', 'header whitespace is stripped upstream')
  assert.equal(checkAdminSecret(withHeader(SECRET.replace('-', ' '))), 'invalid', 'inner whitespace is NOT stripped')
})

it('distinguishes an absent header from a wrong one', () => {
  // The proxy relies on this three-way answer: `absent` falls through to the Clerk session
  // check, `invalid` is rejected outright as a 401. Collapsing them to a boolean would make
  // an ordinary signed-out browser request look like a failed agent attempt.
  assert.equal(checkAdminSecret(new Request('https://mise.test/api/meals')), 'absent')
  assert.equal(checkAdminSecret(withHeader('')), 'absent', 'an empty header value reads as absent')
  assert.equal(checkAdminSecret(withHeader('nope')), 'invalid')
})

it('survives a wrong-length secret instead of throwing', () => {
  // timingSafeEqual THROWS on unequal buffer lengths. The `ab.length === bb.length &&`
  // short-circuit is the only thing standing between a wrong-length header and a 500 on
  // every single one — which would also be a length oracle.
  assert.equal(checkAdminSecret(withHeader('x')), 'invalid', 'far too short')
  assert.equal(checkAdminSecret(withHeader(SECRET + 'x')), 'invalid', 'one byte too long')
  assert.equal(checkAdminSecret(withHeader(SECRET.slice(0, -1))), 'invalid', 'one byte too short')
  assert.equal(checkAdminSecret(withHeader('x'.repeat(4096))), 'invalid', 'absurdly long')
})

it('fails closed when the secret is not configured', () => {
  // The old behaviour this replaced was "env var unset ⇒ app wide open". AGENTS.md rule 5
  // exists because of it, so it gets a test rather than a comment.
  delete process.env.MISE_ADMIN_SECRET
  assert.equal(checkAdminSecret(withHeader('anything')), 'invalid')
  assert.equal(checkAdminSecret(withHeader('')), 'absent', 'still no header, still absent')

  process.env.MISE_ADMIN_SECRET = ''
  assert.equal(checkAdminSecret(withHeader('')), 'absent')
  assert.equal(checkAdminSecret(withHeader('x')), 'invalid', 'an empty configured secret matches nothing')
})

it('reads the header and only the header', () => {
  // Rule 3: never in the query string. A URL ends up in access logs, proxy logs and browser
  // history, so a secret that works from one is a secret that has already leaked.
  const viaQuery = new Request(`https://mise.test/api/meals/import?x-mise-admin-secret=${SECRET}`)
  assert.equal(checkAdminSecret(viaQuery), 'absent', 'a secret in the query string grants nothing')

  const viaOtherHeader = new Request('https://mise.test/api/meals/import', {
    headers: { authorization: `Bearer ${SECRET}`, 'x-admin-secret': SECRET },
  })
  assert.equal(checkAdminSecret(viaOtherHeader), 'absent', 'only x-mise-admin-secret counts')
})

it('matches the header name case-insensitively, as HTTP requires', () => {
  const upper = new Request('https://mise.test/api/meals/import', {
    headers: { 'X-Mise-Admin-Secret': SECRET },
  })
  assert.equal(checkAdminSecret(upper), 'valid')
})
