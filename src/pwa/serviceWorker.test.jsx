import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const updateServiceWorker = vi.fn(async () => {})
const registerState = { needRefresh: true, onRegisteredSW: null }

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options) => {
    registerState.onRegisteredSW = options?.onRegisteredSW
    return {
      needRefresh: [registerState.needRefresh, () => {}],
      offlineReady: [false, () => {}],
      updateServiceWorker,
    }
  },
}))

const { UPDATE_CHECK_MS, useRegisterServiceWorker, useUpdateReady } = await import('./serviceWorker')

function Probe() {
  const { updateReady, update } = useUpdateReady()
  return (
    <button type="button" onClick={update}>
      {updateReady ? 'ready' : 'none'}
    </button>
  )
}

function App() {
  useRegisterServiceWorker()
  return <Probe />
}

afterEach(() => {
  vi.useRealTimers()
  updateServiceWorker.mockClear()
})

describe('service worker registration', () => {
  it('reports a waiting update and applies it', async () => {
    registerState.needRefresh = true
    render(<App />)

    const button = await screen.findByRole('button', { name: 'ready' })
    await userEvent.setup().click(button)

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('checks for a new version every hour and stops when the app unmounts', () => {
    vi.useFakeTimers()
    registerState.needRefresh = false
    const registration = { update: vi.fn() }
    const { unmount } = renderHook(() => useRegisterServiceWorker())

    act(() => registerState.onRegisteredSW('/sw.js', registration))
    expect(registration.update).not.toHaveBeenCalled()
    vi.advanceTimersByTime(UPDATE_CHECK_MS)
    expect(registration.update).toHaveBeenCalledTimes(1)

    unmount()
    vi.advanceTimersByTime(UPDATE_CHECK_MS * 2)
    expect(registration.update).toHaveBeenCalledTimes(1)
  })
})
