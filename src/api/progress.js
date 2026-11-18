import { supabase } from '../lib/supabase'
import { GOAL_COLUMNS } from './goals'

/** Everything the Progress screen needs: my workouts and sets (oldest first) and my goals (soonest first). */
export async function listProgress() {
  const [workouts, sets, goals] = await Promise.all([
    supabase.from('workouts').select('id, type, duration_min, created_at').order('created_at', { ascending: true }),
    supabase
      .from('workout_sets')
      .select('workout_id, exercise, set_no, reps, weight_kg, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .order('target_date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])
  if (workouts.error) throw workouts.error
  if (sets.error) throw sets.error
  if (goals.error) throw goals.error
  return { workouts: workouts.data, sets: sets.data, goals: goals.data }
}
