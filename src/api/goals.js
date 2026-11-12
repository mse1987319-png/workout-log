import { supabase } from '../lib/supabase'

export const GOAL_COLUMNS = 'id, exercise, target_kg, target_date, created_at'

/** Adds one of my goals; the database fills in user_id with auth.uid(). */
export async function createGoal({ exercise, targetKg, targetDate }) {
  const { data, error } = await supabase
    .from('goals')
    .insert({ exercise, target_kg: targetKg, target_date: targetDate })
    .select(GOAL_COLUMNS)
    .single()
  if (error) throw error
  return data
}

/** Removes one of my goals (Row Level Security leaves other people's alone). */
export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}
