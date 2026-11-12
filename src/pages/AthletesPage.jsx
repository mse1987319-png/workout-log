import { Link } from 'react-router-dom'
import { getMyProfile, listMyAthletes } from '../api/sharing'
import { ErrorState, Loading } from '../components/States'
import { friendlyError } from '../lib/errors'
import { formatDay } from '../lib/format'
import { useLoad } from '../lib/useLoad'

const loadAthletes = () =>
  Promise.all([getMyProfile(), listMyAthletes()]).then(([profile, athletes]) => ({ profile, athletes }))

function activity({ workouts_last_7_days: count }) {
  if (count === 0) return 'No workouts in the last 7 days'
  return `${count} ${count === 1 ? 'workout' : 'workouts'} in the last 7 days`
}

// My athletes (instructors): my invite code, and the athletes who share with me.
export default function AthletesPage() {
  const { status, data, error, reload } = useLoad(loadAthletes)
  const code = data?.profile.invite_code

  return (
    <section>
      <h1>My athletes</h1>

      {status === 'loading' && <Loading>Loading your athletes…</Loading>}

      {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

      {status === 'success' && (
        <div className="stack">
          <section className="card stack" aria-labelledby="code-title">
            <h2 id="code-title">Your code</h2>
            {code ? (
              <>
                <p className="invite-code">{code}</p>
                <p className="muted">
                  Athletes type this code under Sharing. Then you can follow their workouts, goals and reports here,
                  and assign them your plans.
                </p>
              </>
            ) : (
              <p className="muted">Only instructor accounts have a code: this account signed up as an athlete.</p>
            )}
          </section>

          <section className="card stack" aria-labelledby="athletes-title">
            <h2 id="athletes-title">Athletes who share with you</h2>
            {data.athletes.length === 0 ? (
              <p className="muted">{code ? `No athletes yet. Give them your code: ${code}.` : 'No athletes yet.'}</p>
            ) : (
              <ul className="person-list" aria-labelledby="athletes-title">
                {data.athletes.map((athlete) => (
                  <li key={athlete.athlete_id} className="person-row">
                    <Link className="person-email" to={`/athletes/${athlete.athlete_id}`}>
                      {athlete.email}
                    </Link>
                    <p>{activity(athlete)}</p>
                    <p className="muted">
                      {athlete.last_workout_at ? `Last workout: ${formatDay(athlete.last_workout_at)}` : 'No workouts yet'}
                      {' · '}
                      {athlete.last_report_at ? `Last report: ${formatDay(athlete.last_report_at)}` : 'No report yet'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
