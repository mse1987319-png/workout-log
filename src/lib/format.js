// workouts.type is the routing field: 'strength' → Zapier path A.
export const TYPE_LABELS = { strength: 'Strength', other: 'Other' }

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
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
