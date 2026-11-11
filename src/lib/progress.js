// Numbers behind the Progress screen. Pure functions, no I/O.

const kg = (value) => String(Number(Number(value).toFixed(2)))
const keyOf = (exercise) => exercise.trim().toLowerCase()
const pad = (n) => String(n).padStart(2, '0')
const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Exercises lifted with weight (> 0 kg), most-trained first, latest spelling. */
export function weightedExercises(sets) {
  const byKey = new Map()
  for (const set of sets) {
    if (!(Number(set.weight_kg) > 0)) continue
    const key = keyOf(set.exercise)
    const entry = byKey.get(key) ?? { sessions: new Set(), name: set.exercise.trim(), at: '' }
    entry.sessions.add(set.workout_id)
    if (set.created_at >= entry.at) {
      entry.name = set.exercise.trim()
      entry.at = set.created_at
    }
    byKey.set(key, entry)
  }
  return [...byKey.entries()]
    .sort(([keyA, a], [keyB, b]) => b.sessions.size - a.sessions.size || keyA.localeCompare(keyB))
    .map(([, entry]) => entry.name)
}

/** The heaviest set of each workout for one exercise, oldest first: [{ date, kg }]. */
export function heaviestPerSession(sets, exercise) {
  const key = keyOf(exercise)
  const byWorkout = new Map()
  for (const set of sets) {
    const weight = Number(set.weight_kg)
    if (keyOf(set.exercise) !== key || !(weight > 0)) continue
    const best = byWorkout.get(set.workout_id)
    if (!best || weight > best.kg) byWorkout.set(set.workout_id, { date: set.created_at, kg: weight })
  }
  return [...byWorkout.values()].sort((a, b) => new Date(a.date) - new Date(b.date))
}

/** Minutes per week (Monday start, local time) for the last `weeks` weeks, oldest first. */
export function weeklyMinutes(workouts, { weeks = 8, now = new Date() } = {}) {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

  const buckets = []
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const from = new Date(monday)
    from.setDate(from.getDate() - 7 * i)
    const to = new Date(from)
    to.setDate(to.getDate() + 7)
    buckets.push({ from, to, row: { weekStart: ymd(from), strength: 0, other: 0 } })
  }

  for (const workout of workouts) {
    const at = new Date(workout.created_at)
    const bucket = buckets.find((b) => at >= b.from && at < b.to)
    if (bucket) bucket.row[workout.type === 'strength' ? 'strength' : 'other'] += workout.duration_min
  }
  return buckets.map((b) => b.row)
}

/** "Squat: 95 kg → 110 kg over 3 sessions (+15 kg)." */
export function describeTrend(exercise, points) {
  if (points.length === 0) return ''
  if (points.length === 1) return `${exercise}: ${kg(points[0].kg)} kg in 1 session.`
  const first = points[0].kg
  const last = points.at(-1).kg
  const change = last - first
  const signed = change >= 0 ? `+${kg(change)}` : `−${kg(-change)}`
  return `${exercise}: ${kg(first)} kg → ${kg(last)} kg over ${points.length} sessions (${signed} kg).`
}

/** "This week: 95 min (60 strength, 35 other)." */
export function describeWeek({ strength, other }) {
  const total = strength + other
  if (total === 0) return 'This week: no workouts yet.'
  return `This week: ${total} min (${strength} strength, ${other} other).`
}
