// Test doubles for the Supabase client. They mirror the method names,
// argument shapes, result shapes and auth events of supabase-js 2.x, so
// the app code under test runs unchanged. No network is involved.
import { vi } from 'vitest'

export const ATHLETE = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'athlete@example.com',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-11-01T09:00:00.000Z',
}

export const INSTRUCTOR = {
  ...ATHLETE,
  id: '00000000-0000-4000-8000-000000000002',
  email: 'coach@example.com',
  user_metadata: { role: 'instructor' },
}

export function sessionFor(user) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1924992000,
    user,
  }
}

function userFor(email) {
  return { ...ATHLETE, id: `user-${email}`, email }
}

export function authError(code, status, message) {
  return Object.assign(new Error(message), { name: 'AuthApiError', code, status })
}

/**
 * Stand-in for `supabase.auth`. `confirmEmail: true` behaves like a
 * project with "Confirm email" turned on: sign-up returns no session.
 */
export function createFakeAuth({ session = null, confirmEmail = false } = {}) {
  let current = session
  let nextId = 1
  const listeners = new Map()

  const emit = (event) => {
    for (const callback of [...listeners.values()]) callback(event, current)
  }

  return {
    // supabase-js reads this before every database request (for the JWT).
    getSession: vi.fn(async () => ({ data: { session: current }, error: null })),
    onAuthStateChange: vi.fn((callback) => {
      const id = `subscription-${nextId++}`
      listeners.set(id, callback)
      // Like supabase-js: INITIAL_SESSION arrives asynchronously.
      Promise.resolve().then(() => listeners.get(id)?.('INITIAL_SESSION', current))
      const unsubscribe = vi.fn(() => listeners.delete(id))
      return { data: { subscription: { id, callback, unsubscribe } } }
    }),
    signInWithPassword: vi.fn(async ({ email }) => {
      current = sessionFor(userFor(email))
      emit('SIGNED_IN')
      return { data: { user: current.user, session: current }, error: null }
    }),
    signUp: vi.fn(async ({ email, options }) => {
      // Like Supabase: options.data becomes the user's metadata.
      const user = { ...userFor(email), user_metadata: options?.data ?? {} }
      if (confirmEmail) return { data: { user, session: null }, error: null }
      current = sessionFor(user)
      emit('SIGNED_IN')
      return { data: { user, session: current }, error: null }
    }),
    signOut: vi.fn(async () => {
      current = null
      emit('SIGNED_OUT')
      return { error: null }
    }),
    // Test-only helper; not part of supabase-js.
    activeListeners: () => listeners.size,
  }
}
