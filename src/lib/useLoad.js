import { useCallback, useEffect, useState } from 'react'

/**
 * Runs `load` when the screen opens and tracks its state:
 * status is 'loading' | 'success' | 'error'. `reload` is for the
 * "Try again" button; `setData` updates the loaded data in place.
 * `load` must be a stable function, such as an imported API call.
 */
export function useLoad(load) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let current = true
    load().then(
      (data) => {
        if (current) setState({ status: 'success', data, error: null })
      },
      (error) => {
        if (current) setState({ status: 'error', data: null, error })
      },
    )
    return () => {
      current = false
    }
  }, [load, attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    setAttempt((count) => count + 1)
  }, [])

  const setData = useCallback((update) => {
    setState((previous) => ({ ...previous, data: update(previous.data) }))
  }, [])

  return { ...state, reload, setData }
}
