import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { setCurrentUser } from '../offline/currentUser'
import { addToOutbox } from '../offline/outbox'
import Layout from './Layout'

// The background work makes requests of its own; its behavior is covered by
// the tests of checkDbVersion, warmUp and startOutboxSync.
vi.mock('../offline/useBackgroundSync', () => ({ useBackgroundSync: () => {} }))

const WORKOUT = { planId: 'plan-1', title: 'Easy run', type: 'cardio', durationMin: 30, sets: [] }

function renderLayout(role) {
  const signOut = vi.fn(async () => {})
  const value = { user: { id: 'user-1', email: 'me@example.com' }, role, signOut }
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>Home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return { signOut, user: userEvent.setup() }
}

const tabs = () =>
  within(screen.getByRole('navigation', { name: 'Main' }))
    .getAllByRole('link')
    .map((link) => link.textContent)

describe('Layout', () => {
  it('shows the tabs for an athlete: My plans, Log, Progress, Sharing', () => {
    renderLayout('athlete')

    expect(tabs()).toEqual(['My plans', 'Log', 'Progress', 'Sharing'])
  })

  it('shows My athletes instead of Sharing for an instructor', () => {
    renderLayout('instructor')

    expect(tabs()).toEqual(['My plans', 'Log', 'My athletes', 'Progress'])
  })

  it('warns before logging out when workouts are waiting', async () => {
    setCurrentUser('user-1')
    addToOutbox({ workout: WORKOUT, planName: 'Plan' })
    const { signOut, user } = renderLayout('athlete')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(signOut).not.toHaveBeenCalled()
    const group = screen.getByRole('group', { name: 'Log out' })
    expect(group).toHaveTextContent(
      "1 workout hasn't been sent yet. It stays on this phone and is sent the next time you log in here.",
    )
    await user.click(within(group).getByRole('button', { name: 'Log out' }))
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('logs out straight away when nothing is waiting', async () => {
    setCurrentUser('user-1')
    const { signOut, user } = renderLayout('athlete')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('group', { name: 'Log out' })).not.toBeInTheDocument()
  })
})
