// The quiet work for a signed-in user, started once by <Layout />: learn the
// database's version, save what logging offline needs, and send the workouts
// waiting on the phone (right away for a returning user, then whenever the
// connection or the screen comes back).
import { useEffect } from 'react'
import { checkDbVersion } from './dbVersion'
import { startOutboxSync } from './sync'
import { warmUp } from './warmUp'

export function useBackgroundSync({ userId, role }) {
  useEffect(() => {
    if (!userId) return undefined
    checkDbVersion()
    // The check is refused while no session is usable, so a start without a
    // connection learns the version once the phone is back online.
    window.addEventListener('online', checkDbVersion)
    warmUp(role)
    const stop = startOutboxSync()
    return () => {
      window.removeEventListener('online', checkDbVersion)
      stop()
    }
  }, [userId, role])
}
