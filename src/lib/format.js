// workouts.type is the routing field: 'strength' → Zapier path A.
export const TYPE_LABELS = { strength: 'Strength', other: 'Other' }

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** 'YYYY-MM-DD' (a local calendar date) → "Nov 2". */
export function formatCalendarDay(ymd) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** 102.5 → "102.5", 100 → "100" (no float noise, no trailing zeros). */
export function formatKg(value) {
  return String(Number(Number(value).toFixed(2)))
}

// workouts.activity values and their labels.
export const ACTIVITIES = [
  ['run', 'Run'],
  ['bike', 'Bike'],
  ['swim', 'Swim'],
  ['walk', 'Walk'],
  ['row', 'Row'],
  ['other', 'Other'],
]
