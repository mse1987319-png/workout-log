import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deletePlan } from '../api/plans'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import OutboxItem from './OutboxItem'
import PlanForm from './PlanForm'
import { ErrorState, SuccessMessage } from './States'
import WorkoutItem from './WorkoutItem'

// The database refuses to delete a plan that athletes logged workouts under
// (foreign_key_violation); there is nothing to retry then.
const REFUSED = '23503'

function confirmText(plan) {
  const count = plan.workouts.length
  if (count === 0) return t('plan.confirmEmpty', { name: plan.name })
  return t('plan.confirmWith', { name: plan.name, count })
}

// One plan with its workouts. assigned: an instructor's plan assigned to me;
// I log my own workouts under it but can't edit or delete it. waiting: the
// workouts logged under it that are still on this phone (outbox items); they
// come before the saved ones.
export default function PlanCard({
  plan,
  assigned = false,
  waiting = [],
  onWorkoutRenamed,
  onPlanUpdated,
  onPlanDeleted,
}) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'delete'
  const [updated, setUpdated] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  useLanguage() // re-render when the language changes

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
              {assigned && <p className="plan-tag">{t('plan.assignedTag')}</p>}
            </div>
            <div className="plan-actions">
              <Link
                className="button button-secondary button-small"
                to={`/log?plan=${plan.id}`}
                aria-label={t('plan.logLabel', { name: plan.name })}
              >
                {t('plan.logButton')}
              </Link>
              {!assigned && (
                <>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-label={t('plan.editLabel', { name: plan.name })}
                    onClick={() => {
                      setUpdated(false)
                      setMode('edit')
                    }}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small button-danger"
                    aria-label={t('plan.deleteLabel', { name: plan.name })}
                    onClick={startDelete}
                  >
                    {t('common.delete')}
                  </button>
                </>
              )}
            </div>
          </div>
          {plan.goal && <p className="plan-goal">{t('plan.goal', { goal: plan.goal })}</p>}
          {updated && <SuccessMessage>{t('plan.updated')}</SuccessMessage>}

          {mode === 'delete' && (
            <div className="confirm-delete" role="group" aria-label={t('plan.deleteGroup', { name: plan.name })}>
              <p>{confirmText(plan)}</p>
              <div className="form-actions">
                <button type="button" className="button button-danger-solid" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? t('plan.deleting') : t('plan.confirmYes')}
                </button>
                <button type="button" className="button button-secondary" disabled={deleting} onClick={() => setMode('view')}>
                  {t('common.cancel')}
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

          {plan.workouts.length === 0 && waiting.length === 0 ? (
            <p className="muted">{t('plan.noWorkouts')}</p>
          ) : (
            <ul className="workout-list">
              {waiting.map((item) => (
                <OutboxItem key={item.id} item={item} />
              ))}
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
