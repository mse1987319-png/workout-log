// Hints for logging a workout offline, from the saved Progress data (all of
// the user's sets): exercise names used before, and "Last time" for one.
import { lastSessionFrom } from '../lib/sets'
import { readSaved } from './savedData'

const nameKey = (name) => name.trim().toLowerCase()

// The saved sets newest first, in set order within a workout; undefined if no progress is saved.
function savedSetsNewestFirst() {
  const sets = readSaved('progress')?.data?.sets
  if (!Array.isArray(sets)) return undefined
  return [...sets].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.set_no - b.set_no)
}

/** Exercise names used before, once each, most recent spelling first. */
export function savedExerciseNames() {
  const names = new Map()
  for (const { exercise } of savedSetsNewestFirst() ?? []) {
    if (!names.has(nameKey(exercise))) names.set(nameKey(exercise), exercise.trim())
  }
  return [...names.values()]
}

/**
 * The sets of an exercise from the most recent saved workout that had it
 * (case-insensitive name), optionally only before a given time. null if none,
 * undefined if no progress is saved (nothing to go on).
 */
export function savedLastSession(exercise, { before } = {}) {
  const sets = savedSetsNewestFirst()
  if (!sets) return undefined
  const name = nameKey(exercise)
  const cutoff = before ? Date.parse(before) : Infinity
  return lastSessionFrom(sets.filter((row) => nameKey(row.exercise) === name && Date.parse(row.created_at) < cutoff))
}
