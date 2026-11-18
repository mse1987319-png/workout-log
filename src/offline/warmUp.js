// Right after sign-in, while the phone is online, save what logging a workout
// offline needs: the plan list, the progress data (for the exercise-name and
// "Last time" hints) and, for instructors, the athletes. Quiet: errors are ignored.
import { listPlanOptions } from '../api/plans'
import { listProgress } from '../api/progress'
import { getAthletesOverview } from '../api/sharing'
import { getCurrentUser } from './currentUser'
import { isOnline } from './network'
import { saveData } from './savedData'

/** `role` is 'athlete' or 'instructor'. Does nothing offline or without a signed-in user. */
export async function warmUp(role) {
  const user = getCurrentUser()
  if (!user || !isOnline()) return

  const jobs = [
    ['planOptions', listPlanOptions],
    ['progress', listProgress],
  ]
  if (role === 'instructor') jobs.push(['athletes', getAthletesOverview])

  await Promise.all(
    jobs.map(async ([key, load]) => {
      try {
        const data = await load()
        // Someone else may have signed in meanwhile: never file this under them.
        if (getCurrentUser() === user) saveData(key, data)
      } catch {
        // Nothing is lost: the screens load their own data when opened.
      }
    }),
  )
}
