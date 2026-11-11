import { describe, expect, it } from 'vitest'
import { friendlyError } from './errors'

// Error shapes mirror what supabase-js 2.x actually returns.
const postgrestNetworkError = {
  message: 'TypeError: Failed to fetch',
  details: 'TypeError: Failed to fetch\n    at fetch (...)',
  hint: '',
  code: '',
}
const authNetworkError = Object.assign(new Error('Failed to fetch'), {
  name: 'AuthRetryableFetchError',
  status: 0,
})
const authApiError = (code, status, message) =>
  Object.assign(new Error(message), { name: 'AuthApiError', code, status })

describe('friendlyError', () => {
  it.each([
    ['a database request (Chrome)', postgrestNetworkError],
    ['an auth request', authNetworkError],
    ['Safari', new TypeError('Load failed')],
    ['Firefox', new TypeError('NetworkError when attempting to fetch resource.')],
  ])('explains a network failure from %s', (_source, error) => {
    expect(friendlyError(error)).toMatch(/can't reach the server/i)
  })

  it('explains wrong login details', () => {
    const error = authApiError('invalid_credentials', 400, 'Invalid login credentials')
    expect(friendlyError(error)).toMatch(/wrong email or password/i)
  })

  it('suggests logging in when the email is already registered', () => {
    const error = authApiError('user_already_exists', 422, 'User already registered')
    expect(friendlyError(error)).toMatch(/already exists.*log in/i)
  })

  it('asks for confirmation when the email is not confirmed yet', () => {
    const error = authApiError('email_not_confirmed', 400, 'Email not confirmed')
    expect(friendlyError(error)).toMatch(/confirm your email/i)
  })

  it.each(['over_email_send_rate_limit', 'over_request_rate_limit'])(
    'asks the user to wait when Supabase rate-limits (%s)',
    (code) => {
      expect(friendlyError(authApiError(code, 429, 'rate limit exceeded'))).toMatch(
        /too many attempts/i,
      )
    },
  )

  it('explains a row-level security refusal', () => {
    const error = {
      message: 'new row violates row-level security policy for table "workouts"',
      details: null,
      hint: null,
      code: '42501',
    }
    expect(friendlyError(error)).toMatch(/permission/i)
  })

  it('passes any other message through unchanged', () => {
    const error = authApiError('weak_password', 422, 'Password should be at least 6 characters.')
    expect(friendlyError(error)).toBe('Password should be at least 6 characters.')
  })

  it.each([undefined, null, {}, { message: '   ' }])('falls back to a generic message for %o', (error) => {
    expect(friendlyError(error)).toMatch(/something went wrong/i)
  })
})
