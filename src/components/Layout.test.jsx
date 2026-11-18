import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { setLanguage } from '../i18n/i18n'
import { setCurrentUser } from '../offline/currentUser'
import { addToOutbox, removeItem, updateItem } from '../offline/outbox'
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

  it('shows Log out as an icon, with Log out and the signed-in email in its tooltip', () => {
    renderLayout('athlete')

    const button = screen.getByRole('button', { name: 'Log out' })
    expect(button.textContent.trim()).toBe('')
    expect(button.querySelector('svg')).not.toBeNull()
    expect(button).toHaveAttribute('title', 'Log out (me@example.com)')
  })

  it('keeps the signed-in email in the header next to the Log out icon', () => {
    renderLayout('athlete')

    const account = screen.getByRole('button', { name: 'Log out' }).parentElement
    expect(within(account).getByText('me@example.com')).toBeInTheDocument()
  })

  it('words the Log out tooltip in Lithuanian too', () => {
    setLanguage('lt')
    renderLayout('athlete')

    expect(screen.getByRole('button', { name: 'Atsijungti' })).toHaveAttribute(
      'title',
      'Atsijungti (me@example.com)',
    )
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

  it('counts only the workouts that will be sent by themselves: waiting or being sent', async () => {
    setCurrentUser('user-1')
    addToOutbox({ workout: WORKOUT, planName: 'Plan' })
    addToOutbox({ workout: WORKOUT, planName: 'Plan', status: 'sending' })
    const failed = addToOutbox({ workout: WORKOUT, planName: 'Plan' })
    updateItem(failed.id, { status: 'failed', error: { message: 'Plan deleted', code: '23503' } })
    const { user } = renderLayout('athlete')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(screen.getByRole('group', { name: 'Log out' })).toHaveTextContent(
      "2 workouts haven't been sent yet. They stay on this phone and are sent the next time you log in here.",
    )
  })

  it("logs out straight away when the only workouts left couldn't be sent", async () => {
    setCurrentUser('user-1')
    const failed = addToOutbox({ workout: WORKOUT, planName: 'Plan' })
    updateItem(failed.id, { status: 'failed', error: { message: 'Plan deleted', code: '23503' } })
    const { signOut, user } = renderLayout('athlete')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('group', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('closes the question by itself once the workout has been sent', async () => {
    setCurrentUser('user-1')
    const sending = addToOutbox({ workout: WORKOUT, planName: 'Plan', status: 'sending' })
    const { signOut, user } = renderLayout('athlete')
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByRole('group', { name: 'Log out' })).toBeInTheDocument()

    // The server takes it while the question is open.
    act(() => removeItem(sending.id))

    expect(screen.queryByRole('group', { name: 'Log out' })).not.toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
    // Closed, not just hidden: another workout kept later doesn't bring it back.
    act(() => {
      addToOutbox({ workout: WORKOUT, planName: 'Plan' })
    })
    expect(screen.queryByRole('group', { name: 'Log out' })).not.toBeInTheDocument()
  })
})
