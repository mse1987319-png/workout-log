// The last data each screen loaded, kept on the phone so the screen can show
// it when the network is down or slow (spec §3). Entries are { savedAt, data }
// under logify.cache.v1.<user id>.<key>, so one person never sees another's,
// and nothing outside this prefix (the outbox, drafts) is ever dropped.
import { getCurrentUser } from './currentUser'
import { keysStartingWith, readJson, removeKey, writeJson } from './storage'

const PREFIX = 'logify.cache.v1.'
// Every workout or athlete opened gets an entry of its own, so these are capped.
const CAPPED_KINDS = ['workout:', 'athlete:']
const MAX_PER_KIND = 30
// When storage is full, at most this many old entries go to make room.
const MAX_EVICTIONS = 20

const prefixFor = (user) => `${PREFIX}${user}.`

// The keys under a prefix, oldest saved first (unreadable entries before all).
function oldestFirst(prefix) {
  return keysStartingWith(prefix)
    .map((key) => ({ key, savedAt: Number(readJson(key)?.savedAt) || 0 }))
    .sort((a, b) => a.savedAt - b.savedAt)
    .map(({ key }) => key)
}

/**
 * Keeps `data` for `user` under `key`; does nothing without a user. Named
 * explicitly for work that can finish after someone else signed in (a sent
 * workout belongs in its owner's copy); screens use saveData.
 */
export function saveDataFor(user, key, data, savedAt = Date.now()) {
  if (!user) return
  const prefix = prefixFor(user)
  const storageKey = prefix + key

  const kind = CAPPED_KINDS.find((capped) => key.startsWith(capped))
  if (kind) {
    const others = oldestFirst(prefix + kind).filter((other) => other !== storageKey)
    while (others.length >= MAX_PER_KIND) removeKey(others.shift())
  }

  const entry = { savedAt, data }
  if (writeJson(storageKey, entry)) return
  // Storage is full: drop this user's oldest saved data until the entry fits.
  const oldest = oldestFirst(prefix)
  for (let tries = 0; tries < MAX_EVICTIONS && oldest.length > 0; tries += 1) {
    removeKey(oldest.shift())
    if (writeJson(storageKey, entry)) return
  }
}

/** Keeps `data` for the signed-in user under `key`; does nothing without one. */
export function saveData(key, data, savedAt) {
  saveDataFor(getCurrentUser(), key, data, savedAt)
}

/** { data, savedAt } saved for `user` under `key`, or null. */
export function readSavedFor(user, key) {
  if (!user) return null
  const entry = readJson(prefixFor(user) + key)
  return typeof entry?.savedAt === 'number' ? { data: entry.data, savedAt: entry.savedAt } : null
}

/** { data, savedAt } saved for the signed-in user under `key`, or null. */
export function readSaved(key) {
  return readSavedFor(getCurrentUser(), key)
}

/** On log out: that user's saved data leaves the phone, and nothing else does. */
export function clearSavedData(userId) {
  keysStartingWith(prefixFor(userId)).forEach(removeKey)
}
