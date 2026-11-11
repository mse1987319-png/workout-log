import { supabase } from '../lib/supabase'

/** Everything the Progress screen needs: my workouts and my sets, oldest first. */
export async function listProgress() {
  const [workouts, sets] = await Promise.all([
    supabase.from('workouts').select('id, type, duration_min, created_at').order('created_at', { ascending: true }),
    supabase
      .from('workout_sets')
      .select('workout_id, exercise, weight_kg, created_at')
      .order('created_at', { ascending: true }),
  ])
  if (workouts.error) throw workouts.error
  if (sets.error) throw sets.error
  return { workouts: workouts.data, sets: sets.data }
}
