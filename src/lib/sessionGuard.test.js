import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { ATHLETE, createFakeAuth, sessionFor } from '../test/fakeSupabase'
import { isNetworkError } from './errors'
import { sessionGuardedFetch } from './sessionGuard'

const URL_BASE = 'https://fake-supabase.test'
const KEY = 'sb_publishable_test'

const answering = () => vi.fn(async () => new Response('[]', { status: 200 }))

describe('sessionGuardedFetch', () => {
  it("passes a database request made with the user's token", async () => {
    const baseFetch = answering()
    const url = `${URL_BASE}/rest/v1/plans?select=id`
    const init = { headers: new Headers({ apikey: KEY, Authorization: 'Bearer user-access-token' }) }

    const response = await sessionGuardedFetch(KEY, baseFetch)(url, init)

    expect(response.status).toBe(200)
    expect(baseFetch).toHaveBeenCalledWith(url, init)
  })

  it('refuses a database request made with the project key, like a dropped connection', async () => {
    const baseFetch = answering()
    const init = { method: 'POST', headers: new Headers({ apikey: KEY, Authorization: `Bearer ${KEY}` }) }

    const error = await sessionGuardedFetch(KEY, baseFetch)(`${URL_BASE}/rest/v1/rpc/log_workout`, init).catch(
      (thrown) => thrown,
    )

    expect(isNetworkError(error)).toBe(true)
    expect(baseFetch).not.toHaveBeenCalled()
  })

  it('passes the database version check, which needs no sign-in', async () => {
    const baseFetch = answering()
    const url = `${URL_BASE}/rest/v1/rpc/schema_version`
    const init = { method: 'POST', headers: new Headers({ apikey: KEY, Authorization: `Bearer ${KEY}` }) }

    await sessionGuardedFetch(KEY, baseFetch)(url, init)

    expect(baseFetch).toHaveBeenCalledWith(url, init)
  })

  it('passes sign-in requests, which always carry the project key', async () => {
    const baseFetch = answering()
    const url = `${URL_BASE}/auth/v1/token?grant_type=refresh_token`
    const init = { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }

    await sessionGuardedFetch(KEY, baseFetch)(url, init)

    expect(baseFetch).toHaveBeenCalledWith(url, init)
  })

  it("keeps supabase-js from reading the database until it has the user's session", async () => {
    backend.reset()
    backend.reply('GET', '/rest/v1/plans', 200, [])
    const client = createClient(URL_BASE, KEY, {
      global: { fetch: sessionGuardedFetch(KEY, backend.fetch) },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { retry: false },
    })

    const withoutSession = await client.from('plans').select('id')
    expect(isNetworkError(withoutSession.error)).toBe(true)
    expect(backend.requests).toEqual([])

    client.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    const withSession = await client.from('plans').select('id')
    expect(withSession.data).toEqual([])
    expect(backend.requests.map((request) => request.headers.get('Authorization'))).toEqual([
      'Bearer test-access-token',
    ])
  })
})
