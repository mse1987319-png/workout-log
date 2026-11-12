import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listPlanOptions } from '../api/plans'
import { EmptyState, ErrorState, Loading } from '../components/States'
import WorkoutForm from '../components/WorkoutForm'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { useLoad } from '../lib/useLoad'

// Log a workout under a plan. Reached from a plan card on My plans
// (/log?plan=<id>); plans are created on their own page.
export default function LogWorkoutPage() {
  const { status, data: plans, error, reload } = useLoad(listPlanOptions)
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [chosenPlanId, setChosenPlanId] = useState(searchParams.get('plan') ?? '')

  // The plan from ?plan= (or the last one picked), else the newest plan.
  const planId = plans?.some((plan) => plan.id === chosenPlanId)
    ? chosenPlanId
    : (plans?.[0]?.id ?? '')

  return (
    <section>
      <h1>{t('log.title')}</h1>

      <div className="card stack">
        <h2>{t('log.workout')}</h2>
        {status === 'loading' && <Loading>{t('plans.loading')}</Loading>}

        {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

        {status === 'success' && plans.length === 0 && (
          <EmptyState
            action={
              <Link className="button" to="/plans/new">
                {t('plans.createFirst')}
              </Link>
            }
          >
            {t('log.noPlans')}
          </EmptyState>
        )}

        {status === 'success' && plans.length > 0 && (
          <WorkoutForm plans={plans} planId={planId} onPlanChange={setChosenPlanId} />
        )}
      </div>
    </section>
  )
}
