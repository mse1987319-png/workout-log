import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listPlanOptions } from '../api/plans'
import { EmptyState, ErrorState, Loading } from '../components/States'
import WorkoutForm from '../components/WorkoutForm'
import { friendlyError } from '../lib/errors'
import { useLoad } from '../lib/useLoad'

// Log a workout under a plan. Reached from a plan card on My plans
// (/log?plan=<id>); plans are created on their own page.
export default function LogWorkoutPage() {
  const { status, data: plans, error, reload } = useLoad(listPlanOptions)
  const [searchParams] = useSearchParams()
  const [chosenPlanId, setChosenPlanId] = useState(searchParams.get('plan') ?? '')

  // The plan from ?plan= (or the last one picked), else the newest plan.
  const planId = plans?.some((plan) => plan.id === chosenPlanId)
    ? chosenPlanId
    : (plans?.[0]?.id ?? '')

  return (
    <section>
      <h1>Log workout</h1>

      <div className="card stack">
        <h2>Workout</h2>
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
            No plans yet — create a plan first, then log workouts under it.
          </EmptyState>
        )}

        {status === 'success' && plans.length > 0 && (
          <WorkoutForm plans={plans} planId={planId} onPlanChange={setChosenPlanId} />
        )}
      </div>
    </section>
  )
}
