import { lastSessionFrom } from '../lib/sets'
import { supabase } from '../lib/supabase'

// ilike treats % and _ as wildcards; a name should only match itself.
const literal = (text) => text.replace(/[\\%_]/g, '\\$&')

/**
 * The sets of an exercise from the most recent workout that had it
 * (case-insensitive name), optionally only before a given time. null if none.
 */
export async function lastSession(exercise, { before } = {}) {
  let query = supabase
    .from('workout_sets')
    .select('workout_id, set_no, reps, weight_kg, created_at')
    .ilike('exercise', literal(exercise.trim()))
    .order('created_at', { ascending: false })
    .order('set_no', { ascending: true })
    .limit(100)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) throw error
  return lastSessionFrom(data)
}

/** Exercise names used before, once each, most recent spelling first. */
export async function listExerciseNames() {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  const names = new Map()
  for (const { exercise } of data) {
    const key = exercise.trim().toLowerCase()
    if (!names.has(key)) names.set(key, exercise.trim())
  }
  return [...names.values()]
}
