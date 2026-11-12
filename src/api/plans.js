import { supabase } from '../lib/supabase'

// No user filter here on purpose: Row Level Security returns only the
// signed-in user's rows (deck test 4 checks exactly that), plus plans an
// instructor assigned to them.

/** My plans (and plans assigned to me), newest first, each with my workouts (newest first). */
export async function listPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('id, user_id, name, goal, created_at, workouts(id, title, type, duration_min, created_at)')
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'workouts', ascending: false })
  if (error) throw error
  return data
}

/** Just id and name, for the plan picker on the Log workout screen. */
export async function listPlanOptions() {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Inserts into table A; user_id is filled in by the database (auth.uid()). */
export async function createPlan({ name, goal }) {
  const { data, error } = await supabase
    .from('plans')
    .insert({ name, goal })
    .select('id, name, goal, created_at')
    .single()
  if (error) throw error
  return data
}
