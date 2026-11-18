import { supabase } from '../lib/supabase'

// The database version this build of the app is made for. The database
// reports its own through schema_version() (supabase/schema.sql).
export const SCHEMA_VERSION = 5

/**
 * The database's version. A database from before v5 has no schema_version()
 * (PostgREST answers PGRST202), which counts as version 0; any other error is
 * thrown, so the caller can tell "older" from "couldn't ask".
 */
export async function getSchemaVersion() {
  const { data, error, status } = await supabase.rpc('schema_version')
  if (error) {
    if (error.code === 'PGRST202') return 0
    throw Object.assign(error, { status })
  }
  return data
}
