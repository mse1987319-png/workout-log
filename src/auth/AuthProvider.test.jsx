import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { ATHLETE, authError, createFakeAuth, sessionFor } from '../test/fakeSupabase'
import { useAuth } from './AuthContext'
import AuthProvider from './AuthProvider'

vi.mock('../lib/supabase', () => ({ supabase: {}, configError: null }))

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

describe('AuthProvider', () => {
  beforeEach(() => {
    supabase.auth = createFakeAuth()
  })

  it('stays loading until Supabase has restored the saved session', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const { result } = renderAuth()

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.user).toEqual(ATHLETE)
  })

  it('reports a signed-out visitor when nothing is saved', async () => {
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeNull()
  })

  it('follows sign-in and sign-out', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(() => result.current.signIn('athlete@example.com', 'secret1'))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'athlete@example.com',
      password: 'secret1',
    })
    expect(result.current.user.email).toBe('athlete@example.com')

    await act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
  })

  it('rejects with the Supabase error when login fails', async () => {
    const error = authError('invalid_credentials', 400, 'Invalid login credentials')
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error,
    })
    const { result } = renderAuth()

    await expect(result.current.signIn('athlete@example.com', 'wrong')).rejects.toBe(error)
  })

  it('sends the sign-up confirmation link back to this site, not to localhost defaults', async () => {
    const { result } = renderAuth()

    await act(() => result.current.signUp('new@example.com', 'secret1'))

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret1',
      options: { emailRedirectTo: 'http://localhost:5173' },
    })
  })

  it('tells the caller whether the email must be confirmed first', async () => {
    const off = renderAuth()
    await expect(off.result.current.signUp('a@example.com', 'secret1')).resolves.toEqual({
      needsConfirmation: false,
    })
    off.unmount()

    supabase.auth = createFakeAuth({ confirmEmail: true })
    const on = renderAuth()
    await expect(on.result.current.signUp('b@example.com', 'secret1')).resolves.toEqual({
      needsConfirmation: true,
    })
  })

  it('stops listening to auth events when unmounted', async () => {
    const { result, unmount } = renderAuth()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(supabase.auth.activeListeners()).toBe(1)

    unmount()

    expect(supabase.auth.activeListeners()).toBe(0)
  })
})
