// Who is signed in, kept outside React so the offline code (saved data, the
// outbox) can scope itself to one person without waiting for a component.
// Two people can share one phone, so nothing saved may be read under the
// wrong id.
let currentUser = null
const listeners = new Set()

export function getCurrentUser() {
  return currentUser
}

// Listeners hear about a change of person only, not about the same id again.
export function setCurrentUser(id) {
  if (id === currentUser) return
  currentUser = id
  listeners.forEach((listener) => listener())
}

export function subscribeCurrentUser(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
