import { supabase } from '../lib/supabase'

/**
 * Inserts into table B. This INSERT is the event that fires the Supabase
 * Database Webhook → Zapier → Gmail. user_id is filled in by the database.
 */
export async function createWorkout({ planId, title, type, durationMin }) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ plan_id: planId, title, type, duration_min: durationMin })
    .select('id, plan_id, title, type, duration_min, created_at')
    .single()
  if (error) throw error
  return data
}

/** An UPDATE: the webhook fires too, and the Zapier Filter stops it (deck test 5). */
export async function renameWorkout(id, title) {
  const { data, error } = await supabase
    .from('workouts')
    .update({ title })
    .eq('id', id)
    .select('id, title')
    .single()
  if (error) throw error
  return data
}
