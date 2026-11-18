import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWorkout } from '../api/workouts'
import LastTime from '../components/LastTime'
import SavedDataNotice from '../components/SavedDataNotice'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { activityLabel, formatDateTime, formatNumber, typeLabel } from '../lib/format'
import { formatPace, groupByExercise } from '../lib/sets'
import { useLoad } from '../lib/useLoad'

const number = (value) => formatNumber(value, 10)

function ExerciseSets({ group, before }) {
  const { t } = useLanguage()
  return (
    <section className="card exercise-sets">
      <h2>{group.exercise}</h2>
      <table className="sets-table">
        <thead>
          <tr>
            <th scope="col">{t('detail.set')}</th>
            <th scope="col">{t('detail.reps')}</th>
            <th scope="col">{t('detail.weight')}</th>
          </tr>
        </thead>
        <tbody>
          {group.sets.map((set, index) => (
            <tr key={set.set_no}>
              <th scope="row">{t('sets.setN', { n: index + 1 })}</th>
              <td>{set.reps}</td>
              <td>{Number(set.weight_kg) > 0 ? `${number(set.weight_kg)} kg` : t('sets.bodyweight')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <LastTime name={group.exercise} before={before} />
    </section>
  )
}

function Workout({ workout, savedAt, onRetry }) {
  const { t } = useLanguage()
  const pace = formatPace(workout.duration_min, workout.distance_km)
  const groups = groupByExercise(workout.workout_sets ?? [])

  return (
    <>
      <h1>{workout.title}</h1>
      {savedAt && <SavedDataNotice savedAt={savedAt} onRetry={onRetry} />}
      <p className="workout-meta">
        <span className={`badge badge-${workout.type}`}>{typeLabel(workout.type)}</span>
        {workout.plan && <span>{workout.plan.name}</span>}
        <span>{formatDateTime(workout.created_at)}</span>
      </p>

      <ul className="stats" aria-label={t('detail.details')}>
        <li>
          <span className="stat-label">{t('detail.duration')}</span>{' '}
          <span>{t('unit.min', { count: workout.duration_min })}</span>
        </li>
        {workout.activity && (
          <li>
            <span className="stat-label">{t('detail.activity')}</span> <span>{activityLabel(workout.activity)}</span>
          </li>
        )}
        {workout.distance_km && (
          <li>
            <span className="stat-label">{t('detail.distance')}</span> <span>{number(workout.distance_km)} km</span>
          </li>
        )}
        {pace && (
          <li>
            <span className="stat-label">{t('detail.pace')}</span> <span>{pace}</span>
          </li>
        )}
      </ul>

      {workout.notes && <p className="notes">{workout.notes}</p>}

      {workout.type === 'strength' &&
        (groups.length === 0 ? (
          <p className="muted">{t('detail.noSets')}</p>
        ) : (
          <div className="stack">
            {groups.map((group) => (
              <ExerciseSets key={group.exercise} group={group} before={workout.created_at} />
            ))}
          </div>
        ))}
    </>
  )
}

// One workout: its details, its sets by exercise and the previous session of each.
export default function WorkoutDetailPage() {
  const { id } = useParams()
  const load = useCallback(() => getWorkout(id), [id])
  const { status, data: workout, error, savedAt, reload } = useLoad(load, `workout:${id}`)
  const { t } = useLanguage()
  const notFound = status === 'error' && error?.code === 'PGRST116'

  return (
    <article className="workout-detail">
      <Link to="/" className="back-link">
        {t('detail.back')}
      </Link>
      {status === 'loading' && <Loading>{t('detail.loading')}</Loading>}
      {notFound && <EmptyState>{t('detail.notFound')}</EmptyState>}
      {status === 'error' && !notFound && <ErrorState message={friendlyError(error)} onRetry={reload} />}
      {status === 'success' && <Workout workout={workout} savedAt={savedAt} onRetry={reload} />}
    </article>
  )
}
