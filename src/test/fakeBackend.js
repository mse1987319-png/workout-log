// A fake Supabase REST API for tests. The app keeps using the real
// supabase-js client; only fetch() is replaced, so tests can check the
// exact HTTP requests the app sends to PostgREST and choose the replies.
import { createClient } from '@supabase/supabase-js'

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function createFakeBackend() {
  const replies = new Map()
  const requests = []

  // Replies are queued per "METHOD /path"; the last one is reused.
  function queue(method, path, makeResponse) {
    const key = `${method} ${path}`
    if (!replies.has(key)) replies.set(key, [])
    replies.get(key).push(makeResponse)
  }

  async function fetch(input, init = {}) {
    const url = new URL(String(input))
    const method = (init.method ?? 'GET').toUpperCase()
    requests.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    })
    const pending = replies.get(`${method} ${url.pathname}`)
    if (!pending?.length) {
      throw new Error(`fake backend: no reply set for ${method} ${url.pathname}`)
    }
    const makeResponse = pending.length > 1 ? pending.shift() : pending[0]
    return makeResponse()
  }

  return {
    fetch,
    requests,
    reset() {
      replies.clear()
      requests.length = 0
    },
    reply(method, path, status, body) {
      queue(method, path, () => json(status, body))
    },
    networkDown(method, path) {
      queue(method, path, () => Promise.reject(new TypeError('Failed to fetch')))
    },
    hang(method, path) {
      queue(method, path, () => new Promise(() => {}))
    },
  }
}

export const backend = createFakeBackend()

export function createTestClient() {
  return createClient('https://fake-supabase.test', 'sb_publishable_test', {
    global: { fetch: (input, init) => backend.fetch(input, init) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Production keeps supabase-js's retries (1 s, 2 s, 4 s); tests skip the wait.
    db: { retry: false },
  })
}
