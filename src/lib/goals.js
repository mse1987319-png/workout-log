// Goals: an exercise, a target weight and a date. Pure functions, no I/O.
// Whether a goal is reached is worked out from the sets every time, so there
// is no stored flag that could go stale.
import { t } from '../i18n/i18n'
import { formatCalendarDay, formatDay, formatKg } from './format'

const DAY = 24 * 60 * 60 * 1000
const MAX_KG = 1000
const keyOf = (exercise) => exercise.trim().toLowerCase()
const pad = (n) => String(n).padStart(2, '0')

/** The local calendar date: 'YYYY-MM-DD'. */
export function toYmd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Whole calendar days from today to 'YYYY-MM-DD'; negative when it has passed. */
export function daysUntil(ymd, now = new Date()) {
  const [year, month, day] = ymd.split('-').map(Number)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / DAY)
}

/** The first problem with a new goal, or '' when it can be saved. */
export function validateGoal({ exercise, targetKg, targetDate }, now = new Date()) {
  if (!exercise.trim()) return t('goals.enterExercise')
  const kg = Number(targetKg)
  if (String(targetKg).trim() === '' || !Number.isFinite(kg) || kg <= 0 || kg > MAX_KG) {
    return t('goals.enterWeight', { max: MAX_KG })
  }
  if (!targetDate) return t('goals.pickDate')
  if (daysUntil(targetDate, now) < 0) return t('goals.pickFuture')
  return ''
}

/**
 * Where a goal stands: the heaviest set so far of its exercise (any
 * spelling) against the target. state is 'reached' (some set got there,
 * even after the date), 'overdue' (the date passed first) or 'active'.
 */
export function goalStatus(goal, sets, now = new Date()) {
  const key = keyOf(goal.exercise)
  const target = Number(goal.target_kg)
  let best = 0
  let reachedOn = null
  for (const set of [...sets].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
    if (keyOf(set.exercise) !== key) continue
    const kg = Number(set.weight_kg)
    if (kg > best) best = kg
    if (!reachedOn && kg >= target) reachedOn = set.created_at
  }
  const daysLeft = daysUntil(goal.target_date, now)
  return {
    best,
    target,
    remaining: Math.max(0, target - best),
    share: Math.min(1, best / target),
    daysLeft,
    reachedOn,
    state: reachedOn ? 'reached' : daysLeft < 0 ? 'overdue' : 'active',
  }
}

/** The line under a goal's bar. */
export function describeGoal(goal, status) {
  if (status.state === 'reached') return t('goals.reached', { date: formatDay(status.reachedOn) })
  const toGo = formatKg(status.remaining)
  if (status.state === 'overdue') return t('goals.overdue', { date: formatCalendarDay(goal.target_date), kg: toGo })
  if (status.daysLeft === 0) return t('goals.dueToday', { kg: toGo })
  return t('goals.toGo', { kg: toGo, count: status.daysLeft })
}

/** "Squat 120 kg" */
export function goalName(goal) {
  return `${goal.exercise.trim()} ${formatKg(goal.target_kg)} kg`
}

/** Soonest date first; goals with the same date in the order they were added. */
export function sortGoals(goals) {
  return [...goals].sort(
    (a, b) => a.target_date.localeCompare(b.target_date) || a.created_at.localeCompare(b.created_at),
  )
}
