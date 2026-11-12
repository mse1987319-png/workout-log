import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWorkout } from '../api/workouts'
import LastTime from '../components/LastTime'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { friendlyError } from '../lib/errors'
import { ACTIVITIES, formatDateTime, TYPE_LABELS } from '../lib/format'
import { formatPace, groupByExercise } from '../lib/sets'
import { useLoad } from '../lib/useLoad'

const ACTIVITY_LABELS = Object.fromEntries(ACTIVITIES)
const number = (value) => String(Number(value))

function ExerciseSets({ group, before }) {
  return (
    <section className="card exercise-sets">
      <h2>{group.exercise}</h2>
      <table className="sets-table">
        <thead>
          <tr>
            <th scope="col">Set</th>
            <th scope="col">Reps</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {group.sets.map((set, index) => (
            <tr key={set.set_no}>
              <th scope="row">Set {index + 1}</th>
              <td>{set.reps}</td>
              <td>{Number(set.weight_kg) > 0 ? `${number(set.weight_kg)} kg` : 'bodyweight'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <LastTime name={group.exercise} before={before} />
    </section>
  )
}

function Workout({ workout }) {
  const pace = formatPace(workout.duration_min, workout.distance_km)
  const groups = groupByExercise(workout.workout_sets ?? [])

  return (
    <>
      <h1>{workout.title}</h1>
      <p className="workout-meta">
        <span className={`badge badge-${workout.type}`}>{TYPE_LABELS[workout.type] ?? workout.type}</span>
        {workout.plan && <span>{workout.plan.name}</span>}
        <span>{formatDateTime(workout.created_at)}</span>
      </p>

      <ul className="stats" aria-label="Workout details">
        <li>
          <span className="stat-label">Duration</span> <span>{workout.duration_min} min</span>
        </li>
        {workout.activity && (
          <li>
            <span className="stat-label">Activity</span> <span>{ACTIVITY_LABELS[workout.activity] ?? workout.activity}</span>
          </li>
        )}
        {workout.distance_km && (
          <li>
            <span className="stat-label">Distance</span> <span>{number(workout.distance_km)} km</span>
          </li>
        )}
        {pace && (
          <li>
            <span className="stat-label">Pace</span> <span>{pace}</span>
          </li>
        )}
      </ul>

      {workout.notes && <p className="notes">{workout.notes}</p>}

      {workout.type === 'strength' &&
        (groups.length === 0 ? (
          <p className="muted">No sets were logged for this workout.</p>
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
  const { status, data: workout, error, reload } = useLoad(load)
  const notFound = status === 'error' && error?.code === 'PGRST116'

  return (
    <article className="workout-detail">
      <Link to="/" className="back-link">
        ← My plans
      </Link>
      {status === 'loading' && <Loading>Loading the workout…</Loading>}
      {notFound && <EmptyState>This workout doesn't exist, or it isn't yours.</EmptyState>}
      {status === 'error' && !notFound && <ErrorState message={friendlyError(error)} onRetry={reload} />}
      {status === 'success' && <Workout workout={workout} />}
    </article>
  )
}
