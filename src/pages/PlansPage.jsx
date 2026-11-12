import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listPlans } from '../api/plans'
import { useAuth } from '../auth/AuthContext'
import PlanCard from '../components/PlanCard'
import { EmptyState, ErrorState, Loading, SuccessMessage } from '../components/States'
import { friendlyError } from '../lib/errors'
import { useLoad } from '../lib/useLoad'

// The List screen: my plans (table A) and the workouts (table B) under each.
export default function PlansPage() {
  const { user } = useAuth()
  const { status, data: plans, error, reload, setData } = useLoad(listPlans)
  const [deletedNotice, setDeletedNotice] = useState(false)

  function handleWorkoutRenamed({ id, title }) {
    setData((current) =>
      current.map((plan) => ({
        ...plan,
        workouts: plan.workouts.map((workout) =>
          workout.id === id ? { ...workout, title } : workout,
        ),
      })),
    )
  }

  function handlePlanUpdated(saved) {
    setDeletedNotice(false)
    setData((current) =>
      current.map((plan) => (plan.id === saved.id ? { ...plan, name: saved.name, goal: saved.goal } : plan)),
    )
  }

  function handlePlanDeleted(id) {
    setData((current) => current.filter((plan) => plan.id !== id))
    setDeletedNotice(true)
  }

  return (
    <section>
      <div className="page-head">
        <h1>My plans</h1>
        <Link className="button" to="/plans/new">
          New plan
        </Link>
      </div>

      {deletedNotice && <SuccessMessage>Plan deleted.</SuccessMessage>}

      {status === 'loading' && <Loading>Loading your plans…</Loading>}

      {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

      {status === 'success' && plans.length === 0 && (
        <EmptyState
          action={
            <Link className="button" to="/plans/new">
              Create your first plan
            </Link>
          }
        >
          No plans yet — create your first plan.
        </EmptyState>
      )}

      {status === 'success' && plans.length > 0 && (
        <ul className="plan-list">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              assigned={plan.user_id !== user?.id}
              onWorkoutRenamed={handleWorkoutRenamed}
              onPlanUpdated={handlePlanUpdated}
              onPlanDeleted={handlePlanDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
