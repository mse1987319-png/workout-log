import { afterEach, describe, expect, it, vi } from 'vitest'
import { isOnline, subscribeOnline } from './network'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('network', () => {
  it('follows the online and offline events', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get')
    const listener = vi.fn()
    const unsubscribe = subscribeOnline(listener)

    onLine.mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    expect(isOnline()).toBe(false)

    onLine.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    expect(isOnline()).toBe(true)

    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })
})
