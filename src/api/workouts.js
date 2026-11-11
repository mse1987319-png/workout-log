import { supabase } from '../lib/supabase'

/**
 * Logs a workout and its sets in one transaction (database function
 * log_workout). The INSERT into workouts is the event that fires the Supabase
 * Database Webhook → Zapier → Gmail, once per workout. user_id is filled in by
 * the database.
 */
export async function createWorkout({
  planId,
  title,
  type,
  durationMin,
  activity = null,
  distanceKm = null,
  notes = null,
  sets = [],
}) {
  const { data, error } = await supabase.rpc('log_workout', {
    p_plan_id: planId,
    p_title: title,
    p_type: type,
    p_duration_min: durationMin,
    p_activity: activity,
    p_distance_km: distanceKm,
    p_notes: notes,
    p_sets: sets,
  })
  if (error) throw error
  return data
}

/** One workout with its plan and its sets (in entry order). */
export async function getWorkout(id) {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, title, type, duration_min, activity, distance_km, notes, created_at, plan:plans(id, name), workout_sets(exercise, set_no, reps, weight_kg)',
    )
    .eq('id', id)
    .order('set_no', { referencedTable: 'workout_sets', ascending: true })
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
