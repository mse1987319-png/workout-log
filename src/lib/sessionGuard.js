// Until supabase-js has a usable session (after reconnecting it may wait up to
// a minute before refreshing an expired one), it sends database requests with
// the project key as the bearer. Row Level Security then answers with empty
// lists, which a screen would save over good saved data as fresh. Such a
// request fails here like a dropped connection instead: screens keep their
// saved data and the outbox waits. Sign-in requests (/auth/v1/) always carry
// the project key, and pass.

// The URL's path; empty when it isn't a web address (nothing to guard).
function pathOf(input) {
  try {
    return new URL(typeof input === 'string' ? input : (input?.url ?? String(input))).pathname
  } catch {
    return ''
  }
}

/** A fetch for supabase-js that refuses database requests made without a user's token. */
export function sessionGuardedFetch(supabaseKey, baseFetch = (...args) => fetch(...args)) {
  const keyAsBearer = `Bearer ${supabaseKey}`
  return async (input, init) => {
    const authorization = new Headers(init?.headers ?? input?.headers).get('Authorization')
    if (authorization === keyAsBearer && pathOf(input).includes('/rest/v1/')) {
      throw new TypeError('Failed to fetch: no signed-in session yet')
    }
    return baseFetch(input, init)
  }
}
