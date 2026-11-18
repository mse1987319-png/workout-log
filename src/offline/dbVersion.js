// What the phone last learned about the database's version, kept in
// localStorage ("logify.dbVersion") so it is known when offline. null means
// never asked; an unknown version is treated as new enough.
import { useSyncExternalStore } from 'react'
import { getSchemaVersion, SCHEMA_VERSION } from '../api/schema'
import { readJson, writeJson } from './storage'

const KEY = 'logify.dbVersion'
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

function store(version) {
  writeJson(KEY, { version, checkedAt: new Date().toISOString() })
  notify()
}

// A number or null, so it is a safe useSyncExternalStore snapshot.
export function getDbVersion() {
  const version = readJson(KEY)?.version
  return Number.isInteger(version) ? version : null
}

export function subscribeDbVersion(listener) {
  listeners.add(listener)
  // Another tab may learn the version first.
  const onStorage = (event) => {
    if (event.key === KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useDbVersion() {
  return useSyncExternalStore(subscribeDbVersion, getDbVersion)
}

// Asks the database and remembers the answer. A failed check (offline or
// anything else) keeps the last known version; it never throws.
export async function checkDbVersion() {
  try {
    store(await getSchemaVersion())
  } catch {
    // Keep what we knew.
  }
}

// A request showed the database lacks the v5 functions: remember "older".
export function markDbOlder() {
  store(0)
}

export function supportsExactlyOnce() {
  const version = getDbVersion()
  return version === null || version >= SCHEMA_VERSION
}

export function isDbOlder() {
  const version = getDbVersion()
  return version !== null && version < SCHEMA_VERSION
}
