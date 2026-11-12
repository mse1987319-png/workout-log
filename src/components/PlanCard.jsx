import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deletePlan } from '../api/plans'
import { friendlyError } from '../lib/errors'
import PlanForm from './PlanForm'
import { ErrorState, SuccessMessage } from './States'
import WorkoutItem from './WorkoutItem'

// The database refuses to delete a plan that athletes logged workouts under
// (foreign_key_violation); there is nothing to retry then.
const REFUSED = '23503'

function confirmText(plan) {
  const count = plan.workouts.length
  if (count === 0) return `Delete “${plan.name}”? This can’t be undone.`
  return `Delete “${plan.name}” and its ${count} ${count === 1 ? 'workout' : 'workouts'}, with their sets? This can’t be undone.`
}

// One plan with its workouts. assigned: an instructor's plan assigned to me;
// I log my own workouts under it but can't edit or delete it.
export default function PlanCard({ plan, assigned = false, onWorkoutRenamed, onPlanUpdated, onPlanDeleted }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'delete'
  const [updated, setUpdated] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  function handleSaved(saved) {
    onPlanUpdated(saved)
    setUpdated(true)
    setMode('view')
  }

  function startDelete() {
    setUpdated(false)
    setDeleteError(null)
    setMode('delete')
  }

  async function confirmDelete() {
    setDeleteError(null)
    setDeleting(true)
    try {
      await deletePlan(plan.id)
      onPlanDeleted(plan.id)
    } catch (error) {
      setDeleteError(error)
      setDeleting(false)
    }
  }

  return (
    <li className="card plan">
      {mode === 'edit' ? (
        <PlanForm plan={plan} onSaved={handleSaved} onCancel={() => setMode('view')} />
      ) : (
        <>
          <div className="plan-head">
            <div>
              <h2>{plan.name}</h2>
              {assigned && <p className="plan-tag">Assigned by your instructor</p>}
            </div>
            <div className="plan-actions">
              <Link
                className="button button-secondary button-small"
                to={`/log?plan=${plan.id}`}
                aria-label={`Log workout under ${plan.name}`}
              >
                + Log workout
              </Link>
              {!assigned && (
                <>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-label={`Edit plan ${plan.name}`}
                    onClick={() => {
                      setUpdated(false)
                      setMode('edit')
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small button-danger"
                    aria-label={`Delete plan ${plan.name}`}
                    onClick={startDelete}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          {plan.goal && <p className="plan-goal">Goal: {plan.goal}</p>}
          {updated && <SuccessMessage>Plan updated.</SuccessMessage>}

          {mode === 'delete' && (
            <div className="confirm-delete" role="group" aria-label={`Delete plan ${plan.name}?`}>
              <p>{confirmText(plan)}</p>
              <div className="form-actions">
                <button type="button" className="button button-danger-solid" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? 'Deleting…' : 'Yes, delete plan'}
                </button>
                <button type="button" className="button button-secondary" disabled={deleting} onClick={() => setMode('view')}>
                  Cancel
                </button>
              </div>
              {deleteError && (
                <ErrorState
                  message={friendlyError(deleteError)}
                  onRetry={deleteError.code === REFUSED ? undefined : confirmDelete}
                />
              )}
            </div>
          )}

          {plan.workouts.length === 0 ? (
            <p className="muted">No workouts logged under this plan yet.</p>
          ) : (
            <ul className="workout-list">
              {plan.workouts.map((workout) => (
                <WorkoutItem key={workout.id} workout={workout} onRenamed={onWorkoutRenamed} />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  )
}
