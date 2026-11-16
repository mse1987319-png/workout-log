import { Link } from 'react-router-dom'
import { getAthletesOverview } from '../api/sharing'
import SavedDataNotice from '../components/SavedDataNotice'
import { ErrorState, Loading } from '../components/States'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { formatDay } from '../lib/format'
import { useLoad } from '../lib/useLoad'

function activity({ workouts_last_7_days: count }) {
  if (count === 0) return t('athletes.noWorkouts7')
  return t('athletes.workouts7', { count })
}

// My athletes (instructors): my invite code, and the athletes who share with me.
export default function AthletesPage() {
  const { status, data, error, savedAt, reload } = useLoad(getAthletesOverview, 'athletes')
  useLanguage() // re-render when the language changes
  const code = data?.profile.invite_code

  return (
    <section>
      <h1>{t('nav.myAthletes')}</h1>
      {savedAt && <SavedDataNotice savedAt={savedAt} onRetry={reload} />}

      {status === 'loading' && <Loading>{t('athletes.loading')}</Loading>}

      {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

      {status === 'success' && (
        <div className="stack">
          <section className="card stack" aria-labelledby="code-title">
            <h2 id="code-title">{t('athletes.codeTitle')}</h2>
            {code ? (
              <>
                <p className="invite-code">{code}</p>
                <p className="muted">
                  {t('athletes.codeHelp')}
                </p>
              </>
            ) : (
              <p className="muted">{t('athletes.noCode')}</p>
            )}
          </section>

          <section className="card stack" aria-labelledby="athletes-title">
            <h2 id="athletes-title">{t('athletes.sharingTitle')}</h2>
            {data.athletes.length === 0 ? (
              <p className="muted">{code ? t('athletes.noneWithCode', { code }) : t('athletes.none')}</p>
            ) : (
              <ul className="person-list" aria-labelledby="athletes-title">
                {data.athletes.map((athlete) => (
                  <li key={athlete.athlete_id} className="person-row">
                    <Link className="person-email" to={`/athletes/${athlete.athlete_id}`}>
                      {athlete.email}
                    </Link>
                    <p>{activity(athlete)}</p>
                    <p className="muted">
                      {athlete.last_workout_at
                        ? t('athletes.lastWorkout', { date: formatDay(athlete.last_workout_at) })
                        : t('athletes.noWorkoutsYet')}
                      {' · '}
                      {athlete.last_report_at
                        ? t('athletes.lastReport', { date: formatDay(athlete.last_report_at) })
                        : t('athletes.noReportYet')}
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
