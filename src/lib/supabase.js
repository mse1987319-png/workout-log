import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './config'

const config = readSupabaseConfig(import.meta.env)

// When the settings are missing, `supabase` is null and the app shows
// `configError` in its Error state instead of crashing on a blank page.
export const configError = config.error
export const supabase = config.error ? null : createClient(config.url, config.key)
