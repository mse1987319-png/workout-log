import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './config'
import { sessionGuardedFetch } from './sessionGuard'

const config = readSupabaseConfig(import.meta.env)

// When the settings are missing, `supabase` is null and the app shows
// `configError` in its Error state instead of crashing on a blank page.
// Database requests without the user's session never leave the phone
// (src/lib/sessionGuard.js).
export const configError = config.error
export const supabase = config.error
  ? null
  : createClient(config.url, config.key, { global: { fetch: sessionGuardedFetch(config.key) } })
