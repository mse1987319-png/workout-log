import { Link } from 'react-router-dom'
import WorkoutItem from './WorkoutItem'

// assigned: an instructor's plan assigned to me; I log my own workouts under it.
export default function PlanCard({ plan, assigned = false, onWorkoutRenamed }) {
  return (
    <li className="card plan">
      <div className="plan-head">
        <div>
          <h2>{plan.name}</h2>
          {assigned && <p className="plan-tag">Assigned by your instructor</p>}
        </div>
        <Link
          className="button button-secondary button-small"
          to={`/log?plan=${plan.id}`}
          aria-label={`Log workout under ${plan.name}`}
        >
          + Log workout
        </Link>
      </div>
      {plan.goal && <p className="plan-goal">Goal: {plan.goal}</p>}

      {plan.workouts.length === 0 ? (
        <p className="muted">No workouts logged under this plan yet.</p>
      ) : (
        <ul className="workout-list">
          {plan.workouts.map((workout) => (
            <WorkoutItem key={workout.id} workout={workout} onRenamed={onWorkoutRenamed} />
          ))}
        </ul>
      )}
    </li>
  )
}
