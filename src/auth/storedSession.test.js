import { describe, expect, it } from 'vitest'
import { ATHLETE, sessionFor } from '../test/fakeSupabase'
import { readStoredSession } from './storedSession'

const KEY = 'sb-test-auth-token'

describe('readStoredSession', () => {
  it('reads a complete stored session', () => {
    localStorage.setItem(KEY, JSON.stringify(sessionFor(ATHLETE)))

    expect(readStoredSession(KEY)).toEqual(sessionFor(ATHLETE))
  })

  it('ignores missing or broken ones', () => {
    expect(readStoredSession(KEY)).toBeNull()

    const complete = sessionFor(ATHLETE)
    const broken = [
      '{not json',
      'null',
      '"a session"',
      '[]',
      JSON.stringify({ ...complete, access_token: '' }),
      JSON.stringify({ ...complete, refresh_token: null }),
      JSON.stringify({ ...complete, user: null }),
      JSON.stringify({ ...complete, user: { ...ATHLETE, id: undefined } }),
    ]
    for (const text of broken) {
      localStorage.setItem(KEY, text)
      expect(readStoredSession(KEY), text).toBeNull()
    }
  })
})
