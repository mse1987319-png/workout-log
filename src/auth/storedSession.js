// supabase-js keeps the signed-in session in localStorage and deletes it only
// when the server rejects it. Offline, once the access token has expired, it
// can't refresh it and reports "no session" though the session is still
// stored (spec §2). This reads that stored copy; it never changes it.
import { readJson } from '../offline/storage'

const isText = (value) => typeof value === 'string' && value !== ''

/** The session stored under `storageKey`, or null when there is none or it is incomplete. */
export function readStoredSession(storageKey) {
  const session = readJson(storageKey)
  const complete = isText(session?.access_token) && isText(session.refresh_token) && isText(session.user?.id)
  return complete ? session : null
}
