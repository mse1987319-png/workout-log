import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { getSchemaVersion, SCHEMA_VERSION } from './schema'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('schema API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('knows which database version the app is built for', () => {
    expect(SCHEMA_VERSION).toBe(5)
  })

  it('reads the database version', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 200, 5)

    await expect(getSchemaVersion()).resolves.toBe(5)
  })

  it('treats a missing schema_version() as an older database', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 404, {
      code: 'PGRST202',
      message: 'Could not find the function public.schema_version without parameters in the schema cache',
      details: null,
      hint: null,
    })

    await expect(getSchemaVersion()).resolves.toBe(0)
  })

  it('throws network errors', async () => {
    backend.networkDown('POST', '/rest/v1/rpc/schema_version')

    await expect(getSchemaVersion()).rejects.toThrow('Failed to fetch')
  })

  it('throws other database errors with the HTTP status', async () => {
    backend.reply('POST', '/rest/v1/rpc/schema_version', 500, { code: 'XX000', message: 'boom' })

    await expect(getSchemaVersion()).rejects.toMatchObject({ code: 'XX000', status: 500 })
  })
})
