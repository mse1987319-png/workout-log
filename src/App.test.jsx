import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { supabase } from './lib/supabase'
import { backend } from './test/fakeBackend'
import { ATHLETE, createFakeAuth, INSTRUCTOR, sessionFor } from './test/fakeSupabase'

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
  // Screens loaded on demand: compile them once up front, so the tests
  // measure routing, not how long the test runner takes to transform them.
  beforeAll(async () => {
    await Promise.all([import('./pages/ProgressPage'), import('./pages/WorkoutDetailPage')])
  }, 60000)

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

  it('opens the Log workout screen from the navigation', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const user = renderApp('/')

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'Log workout' }))

    expect(await screen.findByRole('heading', { name: 'Log workout' })).toBeInTheDocument()
  })

  it('opens the Progress screen from the navigation', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    backend.reply('GET', '/rest/v1/workouts', 200, [])
    backend.reply('GET', '/rest/v1/workout_sets', 200, [])
    backend.reply('GET', '/rest/v1/goals', 200, [])
    const user = renderApp('/')

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'Progress' }))

    expect(await screen.findByRole('heading', { name: 'Progress', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('No workouts yet — log one to see your progress.')).toBeInTheDocument()
  })

  it('shows athletes Sharing in the menu', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    renderApp('/')

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'My plans',
      'Log workout',
      'Progress',
      'Sharing',
    ])
  })

  it('shows instructors My athletes in the menu instead of Sharing', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })
    renderApp('/')

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'My plans',
      'My athletes',
      'Log workout',
      'Progress',
    ])
  })

  it('opens Sharing from the navigation', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    backend.reply('POST', '/rest/v1/rpc/my_instructors', 200, [])
    const user = renderApp('/')

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'Sharing' }))

    expect(await screen.findByRole('heading', { name: 'Sharing', level: 1 })).toBeInTheDocument()
  })

  it('opens My athletes from the navigation', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })
    backend.reply('GET', '/rest/v1/profiles', 200, [{ role: 'instructor', invite_code: 'K7P2QX' }])
    backend.reply('POST', '/rest/v1/rpc/my_athletes', 200, [])
    const user = renderApp('/')

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'My athletes' }))

    expect(await screen.findByRole('heading', { name: 'My athletes', level: 1 })).toBeInTheDocument()
  })

  it('sends an unknown address to the plans', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    renderApp('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'My plans' })).toBeInTheDocument()
  })
})
