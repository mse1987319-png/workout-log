import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUser } from '../offline/currentUser'
import { markDbOlder } from '../offline/dbVersion'
import { addToOutbox, updateItem } from '../offline/outbox'
import StatusBar from './StatusBar'

const syncOutbox = vi.fn(async () => {})
vi.mock('../offline/sync', () => ({ syncOutbox: (...args) => syncOutbox(...args) }))

const update = vi.fn()
let updateReady = false
vi.mock('../pwa/serviceWorker', () => ({ useUpdateReady: () => ({ updateReady, update }) }))

const WORKOUT = { planId: 'plan-1', title: 'Easy run', type: 'cardio', durationMin: 30, sets: [] }
const keep = () => addToOutbox({ workout: WORKOUT, planName: 'Plan' })

function setOnLine(value) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

beforeEach(() => {
  updateReady = false
  syncOutbox.mockClear()
  update.mockClear()
  setCurrentUser('user-1')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StatusBar', () => {
  it('says when the phone is offline', () => {
    setOnLine(false)
    render(<StatusBar />)

    expect(screen.getByText("You're offline. Workouts you log are kept on this phone.")).toBeInTheDocument()
  })

  it('counts waiting workouts and sends them on Send now', async () => {
    const user = userEvent.setup()
    keep()
    keep()
    render(<StatusBar />)

    expect(screen.getByText('2 workouts waiting to send')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send now' }))
    expect(syncOutbox).toHaveBeenCalledTimes(1)

    // A workout that failed has its own line.
    act(() => {
      updateItem(keep().id, { status: 'failed', error: { message: 'no', code: 'x' } })
    })
    expect(screen.getByText("1 workout couldn't be sent: see My plans.")).toBeInTheDocument()
  })

  it('offers no Send now offline, and says Sending… while a workout is on its way', () => {
    setOnLine(false)
    keep()
    const { unmount } = render(<StatusBar />)
    expect(screen.getByText('1 workout waiting to send')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send now' })).not.toBeInTheDocument()
    unmount()

    setOnLine(true)
    updateItem(keep().id, { status: 'sending' })
    render(<StatusBar />)
    expect(screen.getByText('Sending…')).toBeInTheDocument()
  })

  it('warns about an older database and can hide the warning', async () => {
    const user = userEvent.setup()
    markDbOlder()
    render(<StatusBar />)

    expect(screen.getByText(/Logify's database is an older version than this app/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide' }))

    expect(screen.queryByText(/older version than this app/)).not.toBeInTheDocument()
    expect(sessionStorage.getItem('logify.oldDbWarning.hidden')).toBe('1')
  })

  it('offers the new version', async () => {
    const user = userEvent.setup()
    updateReady = true
    render(<StatusBar />)

    expect(screen.getByText('A new version of Logify is ready.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update' }))
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('shows nothing when all is well', () => {
    const { container } = render(<StatusBar />)

    expect(container).toBeEmptyDOMElement()
  })
})
