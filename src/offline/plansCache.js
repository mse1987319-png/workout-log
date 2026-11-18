// My plans and the Log workout screen each keep a saved copy of the plans
// (src/offline/savedData.js): 'plans', with each plan's workouts, and
// 'planOptions', just each plan's id and name. They are kept in step here, so
// that offline:
// - a workout sent while My plans wasn't open is still listed under its plan;
// - the Log workout screen offers the plans as My plans last loaded them: a
//   plan created since the warm-up is there, and a deleted one isn't.
import { getCurrentUser } from './currentUser'
import { readSavedFor, saveDataFor } from './savedData'

// The columns listPlans (src/api/plans.js) selects for each workout.
const WORKOUT_COLUMNS = ['id', 'title', 'type', 'duration_min', 'created_at']

const newestFirst = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)

/**
 * `plans` with a workout the server has just taken (log_workout's row) under
 * its plan: with My plans' columns only, newest first, and only once. The
 * same array when there is nothing to add (no such plan, or listed already).
 */
export function withSentWorkout(plans, row) {
  if (!Array.isArray(plans) || !row) return plans
  const plan = plans.find((candidate) => candidate?.id === row.plan_id)
  if (!Array.isArray(plan?.workouts) || plan.workouts.some((workout) => workout?.id === row.id)) return plans
  const workout = Object.fromEntries(WORKOUT_COLUMNS.map((column) => [column, row[column]]))
  const workouts = [workout, ...plan.workouts].sort(newestFirst)
  return plans.map((candidate) => (candidate === plan ? { ...plan, workouts } : candidate))
}

// Writes `user`'s plans under `key`, and the Log workout screen's plan list
// from them (same order), both as of `savedAt`. A list saved later (by the
// warm-up, or by the Log workout screen's own load) is never replaced with
// older plans.
function keepPlans(user, key, plans, savedAt) {
  if (!user) return
  saveDataFor(user, key, plans, savedAt)
  if (!Array.isArray(plans)) return
  const options = readSavedFor(user, 'planOptions')
  if (options && options.savedAt > savedAt) return
  saveDataFor(user, 'planOptions', plans.map(({ id, name }) => ({ id, name })), savedAt)
}

/**
 * My plans' saveData (useLoad's `save`): keeps the signed-in user's plans
 * under `key`, fresh loads and local changes (renames, deletes) alike, and
 * the Log workout screen's plan list with them.
 */
export function savePlans(key, plans, savedAt = Date.now()) {
  keepPlans(getCurrentUser(), key, plans, savedAt)
}

/**
 * Adds a workout the server has just taken to `user`'s saved copy of My
 * plans, keeping that copy's time: it is no fresher for it. Without a copy
 * (none saved yet, or the user logged out meanwhile) nothing is saved.
 */
export function addSentWorkout(user, row) {
  const saved = readSavedFor(user, 'plans')
  if (!saved) return
  const plans = withSentWorkout(saved.data, row)
  if (plans !== saved.data) keepPlans(user, 'plans', plans, saved.savedAt)
}
