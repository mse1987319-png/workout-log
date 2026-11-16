import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUser } from '../offline/currentUser'
import { readSaved, saveData } from '../offline/savedData'
import { keysStartingWith, readJson } from '../offline/storage'
import { useLoad } from './useLoad'

const SAVED_AT = Date.parse('2026-11-16T16:42:00Z')
const NETWORK_ERROR = { message: 'TypeError: Failed to fetch' }

// A load the test settles by hand.
function deferred() {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

const goOffline = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

beforeEach(() => {
  setCurrentUser('user-1')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useLoad', () => {
  it('saves the loaded data for the signed-in user', async () => {
    const load = vi.fn().mockResolvedValue(['Strength'])
    const { result } = renderHook(() => useLoad(load, 'plans'))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current).toMatchObject({ data: ['Strength'], savedAt: null })
    expect(readJson('logify.cache.v1.user-1.plans')).toMatchObject({ data: ['Strength'] })
  })

  it('shows saved data with its time when the network fails', async () => {
    saveData('plans', ['Saved'], SAVED_AT)
    const load = vi.fn().mockRejectedValue(NETWORK_ERROR)
    const { result } = renderHook(() => useLoad(load, 'plans'))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current).toMatchObject({ data: ['Saved'], savedAt: SAVED_AT, error: null })
  })

  it('keeps the Error state for other errors even with saved data', async () => {
    vi.useFakeTimers()
    saveData('plans', ['Saved'], SAVED_AT)
    const request = deferred()
    const load = vi.fn(() => request.promise)
    const { result } = renderHook(() => useLoad(load, 'plans'))
    await act(() => vi.advanceTimersByTimeAsync(4000))
    expect(result.current.savedAt).toBe(SAVED_AT)

    const error = { code: '42501', message: 'permission denied for table plans' }
    await act(async () => request.reject(error))

    expect(result.current).toMatchObject({ status: 'error', data: null, error, savedAt: null })
  })

  it('shows saved data straight away when the phone is offline', () => {
    saveData('plans', ['Saved'], SAVED_AT)
    goOffline()
    const load = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useLoad(load, 'plans'))

    expect(result.current).toMatchObject({ status: 'success', data: ['Saved'], savedAt: SAVED_AT })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('shows saved data after 4 s on a slow network, then the fresh data', async () => {
    vi.useFakeTimers()
    saveData('plans', ['Saved'], SAVED_AT)
    const request = deferred()
    const load = vi.fn(() => request.promise)
    const { result } = renderHook(() => useLoad(load, 'plans'))

    await act(() => vi.advanceTimersByTimeAsync(3999))
    expect(result.current.status).toBe('loading')

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(result.current).toMatchObject({ status: 'success', data: ['Saved'], savedAt: SAVED_AT })

    await act(async () => request.resolve(['Fresh']))
    expect(result.current).toMatchObject({ status: 'success', data: ['Fresh'], savedAt: null })
  })

  it('keeps fresh data that arrived within 4 s', async () => {
    vi.useFakeTimers()
    saveData('plans', ['Saved'], SAVED_AT)
    const load = vi.fn().mockResolvedValue(['Fresh'])
    const { result } = renderHook(() => useLoad(load, 'plans'))

    await act(() => vi.advanceTimersByTimeAsync(4000))

    expect(result.current).toMatchObject({ status: 'success', data: ['Fresh'], savedAt: null })
  })

  it('offline with nothing saved gives offline_not_saved', async () => {
    goOffline()
    const load = vi.fn().mockRejectedValue(NETWORK_ERROR)
    const { result } = renderHook(() => useLoad(load, 'plans'))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toEqual({ code: 'offline_not_saved', message: 'TypeError: Failed to fetch' })
  })

  it('setData updates the saved copy', async () => {
    const load = vi.fn().mockResolvedValue(['Strength'])
    const { result } = renderHook(() => useLoad(load, 'plans'))
    await waitFor(() => expect(result.current.status).toBe('success'))

    act(() => result.current.setData((plans) => [...plans, 'Cardio']))

    expect(result.current.data).toEqual(['Strength', 'Cardio'])
    expect(readSaved('plans').data).toEqual(['Strength', 'Cardio'])
  })

  it('setData leaves the saved copy and its time alone while saved data is shown', () => {
    saveData('plans', ['Saved'], SAVED_AT)
    goOffline()
    const load = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useLoad(load, 'plans'))

    act(() => result.current.setData((plans) => [...plans, 'Cardio']))

    expect(result.current).toMatchObject({ data: ['Saved', 'Cardio'], savedAt: SAVED_AT })
    expect(readSaved('plans')).toEqual({ data: ['Saved'], savedAt: SAVED_AT })
  })

  it('loads again when the connection comes back while saved data is shown', async () => {
    saveData('plans', ['Saved'], SAVED_AT)
    const onLine = goOffline()
    const first = deferred()
    const second = deferred()
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useLoad(load, 'plans'))
    await act(async () => first.reject(NETWORK_ERROR))
    expect(result.current).toMatchObject({ data: ['Saved'], savedAt: SAVED_AT })

    onLine.mockReturnValue(true)
    act(() => window.dispatchEvent(new Event('online')))

    expect(load).toHaveBeenCalledTimes(2)
    // No Loading in between: the saved data stays until the fresh data is here.
    expect(result.current).toMatchObject({ status: 'success', data: ['Saved'], savedAt: SAVED_AT })

    await act(async () => second.resolve(['Fresh']))
    expect(result.current).toMatchObject({ status: 'success', data: ['Fresh'], savedAt: null })
  })

  it('without a signed-in user nothing is saved or read', async () => {
    saveData('plans', ['Saved'], SAVED_AT)
    setCurrentUser(null)
    goOffline()
    const load = vi.fn().mockRejectedValueOnce(NETWORK_ERROR).mockResolvedValueOnce(['Fresh'])
    const { result } = renderHook(() => useLoad(load, 'plans'))

    // As before saved data existed: the error itself, not saved data or offline_not_saved.
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(NETWORK_ERROR)

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('success'))
    act(() => result.current.setData((plans) => [...plans, 'Cardio']))

    expect(keysStartingWith('logify.cache.v1.')).toEqual(['logify.cache.v1.user-1.plans'])
    expect(readJson('logify.cache.v1.user-1.plans')).toEqual({ savedAt: SAVED_AT, data: ['Saved'] })
  })
})
