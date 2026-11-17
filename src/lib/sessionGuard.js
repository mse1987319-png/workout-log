// Until supabase-js has a usable session (after reconnecting it may wait up to
// a minute before refreshing an expired one), it sends database requests with
// the project key as the bearer. Row Level Security then answers with empty
// lists, which a screen would save over good saved data as fresh. Such a
// request fails here like a dropped connection instead: screens keep their
// saved data and the outbox waits. Sign-in requests (/auth/v1/) always carry
// the project key, and pass. So does the database version check: anyone may
// call schema_version(), which returns a constant, so it is learned as soon
// as the phone is back online, before the session is usable again.
const OPEN_DATABASE_PATH = '/rest/v1/rpc/schema_version'

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
    const path = pathOf(input)
    if (authorization === keyAsBearer && path.includes('/rest/v1/') && !path.endsWith(OPEN_DATABASE_PATH)) {
      throw new TypeError('Failed to fetch: no signed-in session yet')
    }
    return baseFetch(input, init)
  }
}
