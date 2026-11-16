// Turns Supabase / network errors into plain-language messages for the
// Error state, in the current language. Unknown errors keep their own message.
import { t } from '../i18n/i18n'

const NETWORK_FAILURE =
  /failed to fetch|load failed|networkerror|network request failed|aborterror|timeouterror|timed out/i
const NETWORK_ERROR_NAMES = new Set(['AbortError', 'TimeoutError', 'AuthRetryableFetchError'])

// True when the request never got an answer (no signal, dropped, timed out),
// as opposed to the server refusing it.
export function isNetworkError(error) {
  if (NETWORK_ERROR_NAMES.has(error?.name)) return true
  return typeof error?.message === 'string' && NETWORK_FAILURE.test(error.message)
}

// Error codes with a message of their own (translation key: errors.code.<code>).
const KNOWN_CODES = new Set([
  'invalid_credentials',
  'user_already_exists',
  'email_not_confirmed',
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  '42501',
  'PGRST116',
  'offline_not_saved',
  'storage_full',
])

// Messages the database raises on purpose (supabase/schema.sql): English text → translation key.
const DB_MESSAGES = {
  'You sent a report a few minutes ago. Wait a little before sending another.': 'errors.db.reportTooSoon',
  'No instructor has that code. Check it and try again.': 'errors.db.noInstructorCode',
  'That is your own code: give it to your athletes.': 'errors.db.ownCode',
  "Athletes have logged workouts under this plan, so it can't be deleted.": 'errors.db.planHasWorkouts',
}

export function friendlyError(error) {
  const message = typeof error?.message === 'string' ? error.message.trim() : ''

  if (isNetworkError(error)) {
    return t('errors.network')
  }
  if (error?.code && KNOWN_CODES.has(String(error.code))) {
    return t(`errors.code.${error.code}`)
  }
  if (DB_MESSAGES[message]) {
    return t(DB_MESSAGES[message])
  }
  return message || t('errors.generic')
}
