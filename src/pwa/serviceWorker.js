import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// How often an open app asks the server whether a new version exists.
export const UPDATE_CHECK_MS = 3600000

// What the service worker says about updates, for any screen to show.
let state = { updateReady: false, apply: () => {} }
const listeners = new Set()

function publish(next) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Registers the service worker and publishes "a new version is waiting".
// Call it once, at the top of <App />.
export function useRegisterServiceWorker() {
  const checkTimer = useRef(null)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url, registration) {
      clearInterval(checkTimer.current)
      if (registration) {
        checkTimer.current = setInterval(() => registration.update(), UPDATE_CHECK_MS)
      }
    },
  })

  useEffect(() => {
    publish({ updateReady: needRefresh, apply: () => updateServiceWorker(true) })
  }, [needRefresh, updateServiceWorker])

  useEffect(() => () => clearInterval(checkTimer.current), [])
}

// `updateReady`: a new version has downloaded; `update()` switches to it
// (the page reloads).
export function useUpdateReady() {
  const { updateReady, apply } = useSyncExternalStore(subscribe, () => state)
  return { updateReady, update: apply }
}
