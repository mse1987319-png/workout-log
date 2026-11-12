// Turns Supabase / network errors into plain-language messages for the
// Error state, in the current language. Unknown errors keep their own message.
import { t } from '../i18n/i18n'

const NETWORK_FAILURE = /failed to fetch|load failed|networkerror|network request failed/i

// Error codes with a message of their own (translation key: errors.code.<code>).
const KNOWN_CODES = new Set([
  'invalid_credentials',
  'user_already_exists',
  'email_not_confirmed',
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  '42501',
  'PGRST116',
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

  if (NETWORK_FAILURE.test(message)) {
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
