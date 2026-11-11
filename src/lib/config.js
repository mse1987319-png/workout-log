// Reads the two Supabase settings that Vite bakes into the build.
// Returns an error message (instead of throwing) so the app can show
// a readable Error state rather than a blank page.

const PLACEHOLDER = /YOUR-/i

function clean(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text && !PLACEHOLDER.test(text) ? text : ''
}

function isWebAddress(value) {
  try {
    const { protocol } = new URL(value)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

export function readSupabaseConfig(env) {
  const url = clean(env.VITE_SUPABASE_URL)
  const key = clean(env.VITE_SUPABASE_ANON_KEY)

  const missing = []
  if (!url) missing.push('VITE_SUPABASE_URL')
  if (!key) missing.push('VITE_SUPABASE_ANON_KEY')
  if (missing.length > 0) {
    return {
      url: null,
      key: null,
      error: `Missing setting: ${missing.join(' and ')}. Add it to .env.local (or Vercel → Settings → Environment Variables), then restart or redeploy.`,
    }
  }

  if (!isWebAddress(url)) {
    return {
      url: null,
      key: null,
      error: 'VITE_SUPABASE_URL must be a full address, such as https://<project-ref>.supabase.co.',
    }
  }

  return { url, key, error: null }
}
