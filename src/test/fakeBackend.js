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
  // Each route: method + path (+ optional predicate on the request) and a
  // queue of replies; the last reply in a queue is reused. Routes with a
  // predicate are tried first.
  const routes = []
  const requests = []

  function queue(method, path, makeResponse, when = null) {
    let route = routes.find((r) => r.method === method && r.path === path && r.when === when)
    if (!route) {
      route = { method, path, when, replies: [] }
      routes.push(route)
    }
    route.replies.push(makeResponse)
  }

  async function fetch(input, init = {}) {
    const url = new URL(String(input))
    const method = (init.method ?? 'GET').toUpperCase()
    const request = {
      method,
      path: url.pathname,
      query: url.searchParams,
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    }
    requests.push(request)
    const candidates = routes.filter((r) => r.method === method && r.path === url.pathname)
    const route =
      candidates.find((r) => r.when && r.when(request)) ?? candidates.find((r) => !r.when)
    if (!route?.replies.length) {
      throw new Error(`fake backend: no reply set for ${method} ${url.pathname}${url.search}`)
    }
    const makeResponse = route.replies.length > 1 ? route.replies.shift() : route.replies[0]
    return makeResponse()
  }

  return {
    fetch,
    requests,
    reset() {
      routes.length = 0
      requests.length = 0
    },
    reply(method, path, status, body) {
      queue(method, path, () => json(status, body))
    },
    /** Like reply(), but only for requests where when(request) is true. */
    replyWhen(method, path, when, status, body) {
      queue(method, path, () => json(status, body), when)
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
