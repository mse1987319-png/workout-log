// Safe localStorage JSON helpers for the offline features. Storage can be
// missing (private mode), blocked, full or hold broken text, and none of that
// may crash the app, so every call is guarded and reports failure by value.

export function readJson(key) {
  try {
    const text = localStorage.getItem(key)
    return text === null ? null : JSON.parse(text)
  } catch {
    return null
  }
}

// false when the value could not be kept (storage full or blocked).
export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing to remove when storage is blocked.
  }
}

export function keysStartingWith(prefix) {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
  } catch {
    // Blocked storage has no keys.
  }
  return keys
}
