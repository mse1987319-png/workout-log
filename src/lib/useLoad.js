import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser } from '../offline/currentUser'
import { isOnline, subscribeOnline } from '../offline/network'
import { readSaved, saveData } from '../offline/savedData'
import { isNetworkError } from './errors'

// How long a load may take before saved data is shown in its place.
export const FAST_FALLBACK_MS = 4000

const LOADING = { status: 'loading', data: null, error: null, savedAt: null }

/**
 * Runs `load` when the screen opens and tracks its state:
 * status is 'loading' | 'success' | 'error'. `reload` is for the
 * "Try again" button; `setData` updates the loaded data in place.
 * `load` must be a stable function, such as an imported API call.
 *
 * With a `key` and someone signed in, the loaded data is also kept on the
 * phone (src/offline/savedData.js). It is shown when the phone is offline,
 * the load fails for lack of network, or takes over FAST_FALLBACK_MS; then
 * `savedAt` is when it was saved (ms), and null for fresh data.
 */
export function useLoad(load, key = null) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(LOADING)

  useEffect(() => {
    let current = true
    let timer
    // Saved data belongs to the signed-in user; without one, or a key, this is a plain load.
    const caching = Boolean(key) && getCurrentUser() !== null

    // Shows the saved data if there is any; true when it did.
    function showSaved() {
      const saved = readSaved(key)
      if (saved) setState({ status: 'success', data: saved.data, error: null, savedAt: saved.savedAt })
      return saved !== null
    }

    if (caching) {
      // Offline: the saved data straight away. Otherwise only if the load is slow.
      const shown = !isOnline() && showSaved()
      if (!shown) timer = setTimeout(showSaved, FAST_FALLBACK_MS)
    }

    load().then(
      (data) => {
        if (!current) return
        clearTimeout(timer)
        setState({ status: 'success', data, error: null, savedAt: null })
        if (caching) saveData(key, data)
      },
      (error) => {
        if (!current) return
        clearTimeout(timer)
        if (caching && isNetworkError(error)) {
          if (showSaved()) return
          if (!isOnline()) {
            const notSaved = { code: 'offline_not_saved', message: error.message }
            setState({ status: 'error', data: null, error: notSaved, savedAt: null })
            return
          }
        }
        setState({ status: 'error', data: null, error, savedAt: null })
      },
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [load, key, attempt])

  // Back online while saved data is shown: load again, keeping the saved data
  // on screen (no Loading) until the fresh data arrives.
  const showingSaved = state.savedAt !== null
  useEffect(() => {
    if (!showingSaved) return undefined
    return subscribeOnline(() => {
      if (isOnline()) setAttempt((count) => count + 1)
    })
  }, [showingSaved])

  const reload = useCallback(() => {
    setState(LOADING)
    setAttempt((count) => count + 1)
  }, [])

  const setData = useCallback(
    (update) => {
      setState((previous) => {
        const data = update(previous.data)
        // Fresh data changed in place (a rename, a delete) is saved again; saved
        // data keeps its old time. Writing the same entry twice is harmless, so
        // React may run this updater twice (Strict Mode).
        if (key && previous.status === 'success' && previous.savedAt === null) saveData(key, data)
        return { ...previous, data }
      })
    },
    [key],
  )

  return { ...state, reload, setData }
}
