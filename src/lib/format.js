// workouts.type is the routing field: 'strength' → Zapier path A.
export const TYPE_LABELS = { strength: 'Strength', other: 'Other' }

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
