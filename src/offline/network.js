// Whether the phone says it has a connection. navigator.onLine can claim
// "online" without real signal, so callers still treat failed requests as
// offline; this only tells them when to try again.
import { useSyncExternalStore } from 'react'

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine === undefined ? true : navigator.onLine
}

export function subscribeOnline(listener) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, isOnline)
}
