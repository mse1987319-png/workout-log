import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listPlanOptions } from '../api/plans'
import PlanForm from '../components/PlanForm'
import { EmptyState, ErrorState, Loading } from '../components/States'
import WorkoutForm from '../components/WorkoutForm'
import { friendlyError } from '../lib/errors'
import { useLoad } from '../lib/useLoad'

// The Create screen: log a workout under a plan, or create a new plan.
export default function LogWorkoutPage() {
  const { status, data: plans, error, reload, setData } = useLoad(listPlanOptions)
  const [searchParams] = useSearchParams()
  const [chosenPlanId, setChosenPlanId] = useState(searchParams.get('plan') ?? '')
  const planNameRef = useRef(null)

  // The plan from ?plan= (or the last one picked), else the newest plan.
  const planId = plans?.some((plan) => plan.id === chosenPlanId)
    ? chosenPlanId
    : (plans?.[0]?.id ?? '')

  function handlePlanCreated(plan) {
    setData((current) => [{ id: plan.id, name: plan.name }, ...(current ?? [])])
    setChosenPlanId(plan.id)
  }

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
              <button type="button" className="button" onClick={() => planNameRef.current?.focus()}>
                Create your first plan
              </button>
            }
          >
            No plans yet — create your first plan below, then log workouts under it.
          </EmptyState>
        )}

        {status === 'success' && plans.length > 0 && (
          <WorkoutForm plans={plans} planId={planId} onPlanChange={setChosenPlanId} />
        )}
      </div>

      <div className="card stack">
        <h2>New plan</h2>
        <PlanForm nameRef={planNameRef} onCreated={handlePlanCreated} />
      </div>
    </section>
  )
}
