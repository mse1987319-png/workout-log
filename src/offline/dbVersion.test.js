import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import {
  checkDbVersion,
  getDbVersion,
  isDbOlder,
  markDbOlder,
  subscribeDbVersion,
  supportsExactlyOnce,
} from './dbVersion'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('database version on this phone', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('remembers the version on this phone', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 200, 5)

    await checkDbVersion()

    expect(getDbVersion()).toBe(5)
    expect(JSON.parse(localStorage.getItem('logify.dbVersion'))).toMatchObject({ version: 5 })
    expect(isDbOlder()).toBe(false)
  })

  it('keeps the last known version when offline', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 200, 5)
    await checkDbVersion()

    backend.reset()
    backend.networkDown('POST', '/rest/v1/rpc/schema_version')
    await expect(checkDbVersion()).resolves.toBeUndefined()

    expect(getDbVersion()).toBe(5)
  })

  it('keeps the last known version when the check fails for another reason', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 500, { code: 'XX000', message: 'boom' })

    await expect(checkDbVersion()).resolves.toBeUndefined()

    expect(getDbVersion()).toBeNull()
  })

  it('stores 0 when the database has no schema_version()', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 404, {
      code: 'PGRST202',
      message: 'Could not find the function public.schema_version without parameters in the schema cache',
    })

    await checkDbVersion()

    expect(getDbVersion()).toBe(0)
    expect(isDbOlder()).toBe(true)
  })

  it('counts an unknown version as exactly-once', () => {
    expect(getDbVersion()).toBeNull()
    expect(supportsExactlyOnce()).toBe(true)
    expect(isDbOlder()).toBe(false)
  })

  it('markDbOlder makes the database older', () => {
    markDbOlder()

    expect(getDbVersion()).toBe(0)
    expect(isDbOlder()).toBe(true)
    expect(supportsExactlyOnce()).toBe(false)
  })

  it('tells subscribers when the version changes', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeDbVersion(listener)

    markDbOlder()
    expect(listener).toHaveBeenCalledTimes(1)

    backend.reply('POST', '/rest/v1/rpc/schema_version', 200, 5)
    await checkDbVersion()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    markDbOlder()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('follows a change made in another tab', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeDbVersion(listener)

    localStorage.setItem('logify.dbVersion', JSON.stringify({ version: 5, checkedAt: 'x' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'logify.dbVersion' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'logify.language' }))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getDbVersion()).toBe(5)
    unsubscribe()
  })

  it('ignores a stored value that is not a version', () => {
    localStorage.setItem('logify.dbVersion', JSON.stringify({ version: 'five' }))

    expect(getDbVersion()).toBeNull()
  })
})
