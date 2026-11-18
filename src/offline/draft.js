// The half-filled Log workout form (spec §5), kept on the phone so an app
// restart, an update or the phone closing the app doesn't lose it. One draft
// per person, under logify.draft.v1.<user id>.
import { getCurrentUser } from './currentUser'
import { readJson, removeKey, writeJson } from './storage'

const keyFor = (user) => `logify.draft.v1.${user}`

/** The signed-in user's draft, { planId, title, type, duration, exercises, activity, distance, notes, savedAt }, or null. */
export function readDraft() {
  const user = getCurrentUser()
  if (!user) return null
  const draft = readJson(keyFor(user))
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null
  return { ...draft, exercises: Array.isArray(draft.exercises) ? draft.exercises : [] }
}

/** Keeps the fields as the signed-in user's draft. */
export function saveDraft(fields) {
  const user = getCurrentUser()
  if (user) writeJson(keyFor(user), { ...fields, savedAt: Date.now() })
}

export function clearDraft(userId = getCurrentUser()) {
  if (userId) removeKey(keyFor(userId))
}
