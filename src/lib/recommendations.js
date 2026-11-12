// Rule-based suggestions, each with the reason it was made (implementation
// plan §6). Pure functions over the athlete's own history: no I/O, no AI.
import { formatCalendarDay, formatDay, formatKg } from './format'
import { daysUntil, goalName, goalStatus, sortGoals, toYmd } from './goals'
import { heaviestPerSession } from './progress'
import { formatSets } from './sets'

const STEP_KG = 2.5
const IDLE_DAYS = 7
const WINDOW_DAYS = 28
const DAY = 24 * 60 * 60 * 1000

/** Every rule in plain words, in the order its suggestions are listed. */
export const RULES = [
  { kind: 'back', text: 'Pick up where you left off: no workout logged for 7 days or more.' },
  { kind: 'hold', text: 'Hold the weight: at the same top weight, your reps dropped two sessions in a row.' },
  {
    kind: 'pace',
    text: "Aim for more per week: a goal's kg still to go, spread over the weeks left, is more than your heaviest set gained per week over the last 4 weeks.",
  },
  {
    kind: 'add',
    text: 'Add 2.5 kg: in your last two sessions of an exercise, every set at the top weight had the same reps, and the second session matched or beat the first.',
  },
]

const keyOf = (exercise) => exercise.trim().toLowerCase()
const daysSince = (iso, now) => -daysUntil(toYmd(new Date(iso)), now)
const perWeek = (kg) => formatKg(Math.max(0.1, Math.round(kg * 10) / 10))

/** One exercise's session, reduced to the sets at its top weight. */
function atTopWeight({ date, name, sets }) {
  const top = Math.max(...sets.map((set) => set.weight_kg))
  const atTop = sets.filter((set) => set.weight_kg === top)
  return {
    date,
    name,
    top,
    sets: atTop,
    count: atTop.length,
    reps: atTop[0].reps,
    uniform: atTop.every((set) => set.reps === atTop[0].reps),
    totalReps: atTop.reduce((sum, set) => sum + set.reps, 0),
  }
}

/** Each exercise with its sessions oldest first; the most recently trained exercise first. */
function exercisesOf(sets) {
  const byKey = new Map()
  for (const set of sets) {
    const key = keyOf(set.exercise)
    if (!byKey.has(key)) byKey.set(key, new Map())
    const sessions = byKey.get(key)
    if (!sessions.has(set.workout_id)) {
      sessions.set(set.workout_id, { date: set.created_at, name: set.exercise.trim(), sets: [] })
    }
    sessions.get(set.workout_id).sets.push({ reps: Number(set.reps), weight_kg: Number(set.weight_kg) })
  }
  return [...byKey.entries()]
    .map(([key, sessions]) => ({
      key,
      sessions: [...sessions.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map(atTopWeight),
    }))
    .sort((a, b) => new Date(b.sessions.at(-1).date) - new Date(a.sessions.at(-1).date))
}

function backRule(workouts, now) {
  if (workouts.length === 0) return null
  const last = workouts.reduce((latest, w) => (new Date(w.created_at) > new Date(latest.created_at) ? w : latest))
  const days = daysSince(last.created_at, now)
  if (days < IDLE_DAYS) return null
  return {
    key: 'back',
    kind: 'back',
    title: 'Pick up where you left off.',
    because: `Your last workout was ${days} days ago (${formatDay(last.created_at)}).`,
    link: '/log',
  }
}

function holdRule({ key, sessions }) {
  if (sessions.length < 3) return null
  const [a, b, c] = sessions.slice(-3)
  const kg = c.top
  if (!(kg > 0) || a.top !== kg || b.top !== kg) return null
  if (!(a.totalReps > b.totalReps && b.totalReps > c.totalReps)) return null
  return {
    key: `hold:${key}`,
    kind: 'hold',
    title: `${c.name}: hold ${formatKg(kg)} kg or take a lighter week.`,
    because: `Your reps at ${formatKg(kg)} kg dropped two sessions in a row: ${a.totalReps} → ${b.totalReps} → ${c.totalReps}.`,
  }
}

/** kg per week the heaviest set rose over the last 4 weeks (0 without two sessions). */
function recentGain(sets, exercise, now) {
  const points = heaviestPerSession(sets, exercise).filter((point) => daysSince(point.date, now) <= WINDOW_DAYS)
  if (points.length < 2) return 0
  const first = points[0]
  const last = points.at(-1)
  const days = Math.max(7, (new Date(last.date) - new Date(first.date)) / DAY)
  return ((last.kg - first.kg) * 7) / days
}

function timeLeft(days) {
  if (days === 0) return 'today'
  if (days === 1) return 'in 1 day'
  if (days < 14) return `in ${days} days`
  return `in ${Math.round(days / 7)} weeks`
}

function paceRule(goal, sets, now) {
  const status = goalStatus(goal, sets, now)
  if (status.state !== 'active') return null
  const needed = (status.remaining * 7) / Math.max(7, status.daysLeft)
  const gained = recentGain(sets, goal.exercise, now)
  if (gained >= needed) return null
  const lately =
    gained > 0
      ? `your sessions in the last 4 weeks gained +${perWeek(gained)} kg a week.`
      : "your heaviest set hasn't gone up in the last 4 weeks."
  return {
    key: `pace:${goal.id}`,
    kind: 'pace',
    title: `${goalName(goal)} by ${formatCalendarDay(goal.target_date)}: aim for +${perWeek(needed)} kg a week.`,
    because: `${formatKg(status.remaining)} kg to go ${timeLeft(status.daysLeft)}; ${lately}`,
  }
}

function addRule({ key, sessions }) {
  if (sessions.length < 2) return null
  const [before, last] = sessions.slice(-2)
  const kg = last.top
  if (!(kg > 0) || before.top !== kg || !before.uniform || !last.uniform) return null
  if (last.count < before.count || last.reps < before.reps) return null
  const same = last.count === before.count && last.reps === before.reps
  return {
    key: `add:${key}`,
    kind: 'add',
    title: `${last.name}: add ${formatKg(STEP_KG)} kg next time (${formatKg(kg + STEP_KG)} kg).`,
    because: same
      ? `You did ${formatSets(last.sets)} in each of your last two sessions.`
      : `You did ${formatSets(before.sets)}, then ${formatSets(last.sets)}.`,
  }
}

/** Suggestions for the Progress screen, most urgent kind first (see RULES). */
export function suggest({ workouts, sets, goals }, now = new Date()) {
  const exercises = exercisesOf(sets)
  return [
    backRule(workouts, now),
    ...exercises.map(holdRule),
    ...sortGoals(goals).map((goal) => paceRule(goal, sets, now)),
    ...exercises.map(addRule),
  ].filter(Boolean)
}
