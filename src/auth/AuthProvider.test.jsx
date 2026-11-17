import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../offline/currentUser'
import { readDraft, saveDraft } from '../offline/draft'
import { addToOutbox, getOutbox } from '../offline/outbox'
import { readSaved, saveData } from '../offline/savedData'
import { ATHLETE, authError, createFakeAuth, sessionFor } from '../test/fakeSupabase'
import { useAuth } from './AuthContext'
import AuthProvider from './AuthProvider'
import RequireAuth from './RequireAuth'

vi.mock('../lib/supabase', () => ({ supabase: {}, configError: null }))

// What supabase-js answers when the server can't be reached.
const SERVER_UNREACHABLE = { name: 'AuthRetryableFetchError', message: 'Failed to fetch' }

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

describe('AuthProvider', () => {
  beforeEach(() => {
    supabase.auth = createFakeAuth()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
    // Online: logged out everywhere, as before.
    expect(supabase.auth.signOut).toHaveBeenCalledWith()
  })

  it('stays signed in offline with the session saved on the phone', async () => {
    // Offline, supabase-js can't refresh an expired access token: it reports no
    // session, but keeps the session in storage until the server rejects it.
    localStorage.setItem('sb-test-auth-token', JSON.stringify(sessionFor(ATHLETE)))
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.user).toEqual(ATHLETE)
    expect(getCurrentUser()).toBe(ATHLETE.id)
  })

  it('sends a visitor with nothing saved to Login as before', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <p>my plans</p>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<p>login screen</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(await screen.findByText('login screen')).toBeInTheDocument()
    expect(getCurrentUser()).toBeNull()
  })

  it('goes back to signed out when Supabase ends the session saved on the phone', async () => {
    localStorage.setItem('sb-test-auth-token', JSON.stringify(sessionFor(ATHLETE)))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).toEqual(ATHLETE))

    // Back online, the server rejects the session and supabase-js signs out.
    await act(() => supabase.auth.signOut())

    expect(result.current.user).toBeNull()
    expect(getCurrentUser()).toBeNull()
  })

  it('tells the app who is signed in', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(getCurrentUser()).toBe(ATHLETE.id)

    await act(() => result.current.signOut())

    expect(getCurrentUser()).toBeNull()
  })

  it('tells a screen who is signed in before its first load', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const firstLoads = []
    // A screen's first load runs in its effect, before any effect of the
    // provider above it; its saved data, outbox and draft need the user then.
    function Screen() {
      const [atFirstRender] = useState(getCurrentUser)
      useEffect(() => {
        firstLoads.push(getCurrentUser())
      }, [])
      return <p>screen for {atFirstRender}</p>
    }
    function SignedInOnly() {
      return useAuth().session ? <Screen /> : null
    }
    render(
      <AuthProvider>
        <SignedInOnly />
      </AuthProvider>,
    )

    expect(await screen.findByText(`screen for ${ATHLETE.id}`)).toBeInTheDocument()
    expect(firstLoads).toEqual([ATHLETE.id])
  })

  it('logs out on this phone only when offline', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    // Like supabase-js offline: the session ends on this phone first, then
    // telling the server fails.
    const endHere = supabase.auth.signOut.getMockImplementation()
    supabase.auth.signOut.mockImplementationOnce(async (options) => {
      await endHere(options)
      return { error: SERVER_UNREACHABLE }
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).toEqual(ATHLETE))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await act(() => result.current.signOut())

    expect(supabase.auth.signOut.mock.calls).toEqual([[{ scope: 'local' }]])
    expect(result.current.user).toBeNull()
  })

  it("falls back to logging out on this phone when the server can't be reached", async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    supabase.auth.signOut.mockResolvedValueOnce({ error: SERVER_UNREACHABLE })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).toEqual(ATHLETE))

    await act(() => result.current.signOut())

    expect(supabase.auth.signOut.mock.calls).toEqual([[], [{ scope: 'local' }]])
    expect(result.current.user).toBeNull()
  })

  it('keeps the user signed in, with their saved data, when the server refuses to log out', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const refused = authError('over_request_rate_limit', 429, 'Request rate limit reached')
    supabase.auth.signOut.mockResolvedValueOnce({ error: refused })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).toEqual(ATHLETE))
    saveData('plans', [{ id: 'plan-1', name: 'Strength block' }])

    await expect(result.current.signOut()).rejects.toBe(refused)

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(result.current.user).toEqual(ATHLETE)
    expect(readSaved('plans')).not.toBeNull()
  })

  it("deletes the user's saved data and draft on log out, but keeps unsent workouts", async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get')
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(() => result.current.signIn('a@example.com', 'secret1'))
    const a = getCurrentUser()
    saveData('plans', [{ id: 'plan-1', name: 'Strength block' }])
    saveDraft({ planId: 'plan-1', title: 'Leg day', exercises: [] })
    const waiting = addToOutbox({ workout: { planId: 'plan-1', title: 'Easy run' }, planName: 'Strength block' })
    expect(readSaved('plans')).not.toBeNull()
    expect(readDraft()).not.toBeNull()

    // A logs out with no signal while a workout waits to send.
    onLine.mockReturnValue(false)
    await act(() => result.current.signOut())

    expect(localStorage.getItem(`logify.cache.v1.${a}.plans`)).toBeNull()
    expect(localStorage.getItem(`logify.draft.v1.${a}`)).toBeNull()
    expect(localStorage.getItem(`logify.outbox.v1.${a}`)).not.toBeNull()

    // B logs in on the same phone and gets none of it.
    onLine.mockReturnValue(true)
    await act(() => result.current.signIn('b@example.com', 'secret1'))
    expect(readSaved('plans')).toBeNull()
    expect(readDraft()).toBeNull()
    expect(getOutbox()).toEqual([])
    await act(() => result.current.signOut())

    // A logs in again: the workout is still waiting to send.
    await act(() => result.current.signIn('a@example.com', 'secret1'))
    expect(getOutbox()).toEqual([expect.objectContaining({ id: waiting.id, status: 'waiting' })])
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
      options: { emailRedirectTo: 'http://localhost:5173', data: { role: 'athlete' } },
    })
  })

  it('stores the role picked at sign-up and reports it', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(() => result.current.signUp('coach@example.com', 'secret1', 'instructor'))

    expect(supabase.auth.signUp.mock.calls[0][0].options.data).toEqual({ role: 'instructor' })
    expect(result.current.role).toBe('instructor')
  })

  it('treats a user without a role as an athlete', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.role).toBe('athlete')
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
