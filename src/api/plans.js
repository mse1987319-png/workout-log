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

const PLAN_COLUMNS = 'id, user_id, name, goal, created_at'

/** Renames my plan / changes its goal. Row Level Security leaves other people's plans alone (no row → PGRST116). */
export async function updatePlan({ id, name, goal }) {
  const { data, error } = await supabase.from('plans').update({ name, goal }).eq('id', id).select(PLAN_COLUMNS).single()
  if (error) throw error
  return data
}

/**
 * Deletes my plan and, with it, my workouts and their sets. The database
 * refuses a plan that athletes have logged workouts under; a plan that isn't
 * mine (or is already gone) deletes nothing, which is reported as PGRST116.
 */
export async function deletePlan(id) {
  const { data, error } = await supabase.from('plans').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw Object.assign(new Error('Nothing was deleted.'), { code: 'PGRST116' })
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
