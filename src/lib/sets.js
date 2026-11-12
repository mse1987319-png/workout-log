// Helpers for exercises, sets and cardio details. Pure functions, no I/O.
import { t } from '../i18n/i18n'
import { formatNumber } from './format'

const MAX_SETS = 100
const MAX_REPS = 1000
const MAX_KG = 1000

const kg = (value) => formatNumber(value, 10)

/** Sets of one workout, grouped by exercise in the order they were entered. */
export function groupByExercise(sets) {
  const groups = new Map()
  for (const { exercise, set_no, reps, weight_kg } of [...sets].sort((a, b) => a.set_no - b.set_no)) {
    const key = exercise.trim().toLowerCase()
    if (!groups.has(key)) groups.set(key, { exercise, sets: [] })
    groups.get(key).sets.push({ set_no, reps, weight_kg })
  }
  return [...groups.values()]
}

/** "2 × 5 @ 100 kg, 5 @ 102.5 kg": equal sets in a row are counted. */
export function formatSets(sets) {
  const runs = []
  for (const set of sets) {
    const last = runs.at(-1)
    if (last && last.reps === set.reps && Number(last.weight_kg) === Number(set.weight_kg)) last.count += 1
    else runs.push({ reps: set.reps, weight_kg: set.weight_kg, count: 1 })
  }
  return runs
    .map(({ reps, weight_kg, count }) => {
      const what = count > 1 ? `${count} × ${reps}` : `${reps}`
      return Number(weight_kg) > 0 ? `${what} @ ${kg(weight_kg)} kg` : `${what} ${t('sets.bodyweightParen')}`
    })
    .join(', ')
}

/** Minutes per kilometre, e.g. "5:36 /km"; null without a distance. */
export function formatPace(durationMin, distanceKm) {
  if (!distanceKm || Number(distanceKm) <= 0) return null
  const seconds = Math.round((durationMin * 60) / Number(distanceKm))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /km`
}

/** Editor state → the p_sets payload of log_workout (set_no runs across the workout). */
export function toSetsPayload(exercises) {
  let setNo = 0
  return exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      exercise: exercise.name.trim(),
      set_no: (setNo += 1),
      reps: Number(set.reps),
      weight_kg: set.weight === '' ? 0 : Number(set.weight),
    })),
  )
}

/** The first problem in the exercises block, or '' when it can be saved. */
export function validateExercises(exercises) {
  for (const [index, exercise] of exercises.entries()) {
    const n = index + 1
    const name = exercise.name.trim()
    if (!name) return t('sets.enterName', { n })
    if (exercise.sets.length === 0) return t('sets.addAtLeastOne', { n, name })
    for (const [setIndex, set] of exercise.sets.entries()) {
      const where = t('sets.where', { n, name, m: setIndex + 1 })
      const reps = Number(set.reps)
      if (!/^\d+$/.test(String(set.reps).trim()) || reps < 1 || reps > MAX_REPS) {
        return t('sets.badReps', { where, max: MAX_REPS })
      }
      const weight = set.weight === '' ? 0 : Number(set.weight)
      if (!Number.isFinite(weight) || weight < 0 || weight > MAX_KG) {
        return t('sets.badWeight', { where, max: MAX_KG })
      }
    }
  }
  const total = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  if (total > MAX_SETS) return t('sets.tooMany', { max: MAX_SETS })
  return ''
}

/** Rows of an exercise's history (newest first) → that last workout's sets. */
export function lastSessionFrom(rows) {
  if (rows.length === 0) return null
  const [newest] = rows
  return {
    date: newest.created_at,
    sets: rows
      .filter((row) => row.workout_id === newest.workout_id)
      .sort((a, b) => a.set_no - b.set_no)
      .map(({ set_no, reps, weight_kg }) => ({ set_no, reps, weight_kg })),
  }
}
