import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { supabase } from './lib/supabase'
import { backend } from './test/fakeBackend'
import { ATHLETE, createFakeAuth, sessionFor } from './test/fakeSupabase'

// A real supabase-js client on the fake REST backend, with the auth
// part swapped for the in-memory fake (sign-in without a server).
vi.mock('./lib/supabase', async () => {
  const { createTestClient } = await import('./test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

function renderApp(path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('App', () => {
  beforeEach(() => {
    supabase.auth = createFakeAuth()
    backend.reset()
    backend.reply('GET', '/rest/v1/plans', 200, [])
  })

  it('opens the login screen for a signed-out visitor', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows a signed-in user their plans area and their email', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'My plans' })).toBeInTheDocument()
    expect(screen.getByText('athlete@example.com')).toBeInTheDocument()
  })

  it("loads the plans with the signed-in user's token, which RLS checks", async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    renderApp('/')

    expect(await screen.findByText('No plans yet — create your first plan.')).toBeInTheDocument()
    const [request] = backend.requests
    expect(request.path).toBe('/rest/v1/plans')
    expect(request.headers.get('Authorization')).toBe('Bearer test-access-token')
  })

  it('logs out from the header and returns to the login screen', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const user = renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('explains a failed logout and lets the user try again', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    // supabase-js keeps the session when the logout request fails.
    supabase.auth.signOut.mockResolvedValueOnce({
      error: Object.assign(new Error('Failed to fetch'), {
        name: 'AuthRetryableFetchError',
        status: 0,
      }),
    })
    const user = renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    expect(screen.getByRole('heading', { name: 'My plans' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(2)
  })

  it('sends an unknown address to the plans', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    renderApp('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'My plans' })).toBeInTheDocument()
  })
})
