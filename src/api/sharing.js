import { supabase } from '../lib/supabase'

// Instructor sharing. An instructor never queries an athlete's tables: the
// database functions (rpc) check the link first; see supabase/schema.sql.

const ASSIGNMENT = 'plan_id, created_at, plan:plans(id, name)'

/** My own profile (RLS shows only mine): role and, for instructors, the invite code. */
export async function getMyProfile() {
  const { data, error } = await supabase.from('profiles').select('role, invite_code').maybeSingle()
  if (error) throw error
  return data ?? { role: 'athlete', invite_code: null }
}

/** Shares my data with the instructor who has this code: { instructor_id, email, linked_at }. */
export async function linkInstructor(code) {
  const { data, error } = await supabase.rpc('link_instructor', { p_code: code })
  if (error) throw error
  return data
}

/** The instructors I share with: [{ instructor_id, email, linked_at }]. */
export async function listMyInstructors() {
  const { data, error } = await supabase.rpc('my_instructors')
  if (error) throw error
  return data
}

/** Stops sharing with one instructor (deletes my link to them). */
export async function stopSharing(instructorId) {
  const { error } = await supabase.from('instructor_links').delete().eq('instructor_id', instructorId)
  if (error) throw error
}

/** The athletes who share with me, with their latest activity. */
export async function listMyAthletes() {
  const { data, error } = await supabase.rpc('my_athletes')
  if (error) throw error
  return data
}

/** What the My athletes screen shows: my profile (invite code) and the athletes who share with me. */
export async function getAthletesOverview() {
  const [profile, athletes] = await Promise.all([getMyProfile(), listMyAthletes()])
  return { profile, athletes }
}

/** One athlete's workouts, sets, goals and latest reports; refused unless they share with me. */
export async function getAthleteProgress(athleteId) {
  const { data, error } = await supabase.rpc('athlete_progress', { p_athlete: athleteId })
  if (error) throw error
  return data
}

/** My plans assigned to one athlete, oldest first. */
export async function listAssignments(athleteId) {
  const { data, error } = await supabase
    .from('plan_assignments')
    .select(ASSIGNMENT)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/** Assigns one of my plans to an athlete who shares with me; assigned_by is filled in by the database. */
export async function assignPlan({ planId, athleteId }) {
  const { data, error } = await supabase
    .from('plan_assignments')
    .insert({ plan_id: planId, athlete_id: athleteId })
    .select(ASSIGNMENT)
    .single()
  if (error) throw error
  return data
}

export async function unassignPlan({ planId, athleteId }) {
  const { error } = await supabase.from('plan_assignments').delete().eq('plan_id', planId).eq('athlete_id', athleteId)
  if (error) throw error
}
