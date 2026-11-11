// Turns Supabase / network errors into plain-language messages for the
// Error state. Unknown errors keep their own message.

const NETWORK_FAILURE = /failed to fetch|load failed|networkerror|network request failed/i

const BY_CODE = {
  invalid_credentials: 'Wrong email or password.',
  user_already_exists: 'An account with this email already exists. Log in instead.',
  email_not_confirmed: 'Please confirm your email first: open the link we sent you, then log in.',
  over_email_send_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
  42501: "You don't have permission to do that.",
}

export function friendlyError(error) {
  const message = typeof error?.message === 'string' ? error.message.trim() : ''

  if (NETWORK_FAILURE.test(message)) {
    return "Can't reach the server. Check your internet connection and try again."
  }
  if (error?.code && BY_CODE[error.code]) {
    return BY_CODE[error.code]
  }
  return message || 'Something went wrong. Please try again.'
}
