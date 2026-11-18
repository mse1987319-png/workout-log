'use strict'
// Helpers for writing the made-up data (a "world") the mock serves. A world is
// plain arrays, one per table of supabase/schema.sql, so reading it is easy and
// the mock can change it as the scene goes on. Times are local wall-clock text
// ("2026-11-10 18:05", Europe/Vilnius); see time.cjs.

const { at } = require('./time.cjs')
const { formatSets } = require('./mock.cjs')

function createWorld() {
  serial = 0 // every world gets the same ids, so runs repeat exactly
  return {
    users: [],
    plans: [],
    workouts: [],
    workout_sets: [],
    goals: [],
    reports: [],
    instructor_links: [],
    plan_assignments: [],
  }
}

let serial = 0
// Readable, stable ids: <hex tag>-<n>; the tag tells the kind of row apart.
const id = (tag) => {
  serial += 1
  return `${tag.repeat(8).slice(0, 8)}-0000-4000-8000-${String(serial).padStart(12, '0')}`
}

/**
 * A person. `key` is how scenes name them ("jonas"); `email` is what the app
 * shows; `inviteCode` makes an instructor's code. Anyone can sign in with
 * `password`.
 */
function addUser(world, { key, email, role = 'athlete', inviteCode = null, password = 'demo-password', created = '2026-10-01 10:00' }) {
  const user = { key, id: id('f'), email, role, inviteCode, password, createdAt: at(created) }
  world.users.push(user)
  return user
}

/** A plan owned by `owner` (a user). */
function addPlan(world, { owner, name, goal = null, created }) {
  const plan = { id: id('a'), user_id: owner.id, name, goal, created_at: at(created) }
  world.plans.push(plan)
  return plan
}

/**
 * A logged workout with its sets: sets = [[exercise, reps, kg], ...] in entry
 * order (kg 0 = bodyweight). The summary line is written the way the database does.
 */
function addWorkout(world, { owner, plan, title, type, minutes, when, activity = null, km = null, notes = null, sets = [] }) {
  const createdAt = at(when)
  const rows = sets.map(([exercise, reps, kg], index) => ({
    id: id('d'),
    workout_id: null,
    user_id: owner.id,
    exercise,
    set_no: index + 1,
    reps,
    weight_kg: kg,
    created_at: createdAt,
  }))
  const workout = {
    id: id('b'),
    user_id: owner.id,
    plan_id: plan.id,
    title,
    type,
    duration_min: minutes,
    activity,
    distance_km: km,
    notes,
    sets_summary: formatSets(rows),
    created_at: createdAt,
  }
  for (const row of rows) row.workout_id = workout.id
  world.workouts.push(workout)
  world.workout_sets.push(...rows)
  return workout
}

function addGoal(world, { owner, exercise, kg, by, created }) {
  const goal = { id: id('c'), user_id: owner.id, exercise, target_kg: kg, target_date: by, created_at: at(created) }
  world.goals.push(goal)
  return goal
}

function addReport(world, { owner, when, summary, stats = {} }) {
  const row = {
    id: id('e'),
    user_id: owner.id,
    athlete_email: owner.email,
    period_start: at(when).slice(0, 10),
    period_end: at(when).slice(0, 10),
    summary,
    stats,
    created_at: at(when),
  }
  world.reports.push(row)
  return row
}

/** `athlete` shares with `instructor`. */
function link(world, { instructor, athlete, created }) {
  world.instructor_links.push({ instructor_id: instructor.id, athlete_id: athlete.id, created_at: at(created) })
}

/** `instructor` assigns their `plan` to `athlete`. */
function assign(world, { instructor, plan, athlete, created }) {
  world.plan_assignments.push({ plan_id: plan.id, athlete_id: athlete.id, assigned_by: instructor.id, created_at: at(created) })
}

module.exports = { createWorld, addUser, addPlan, addWorkout, addGoal, addReport, link, assign }
