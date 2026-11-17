import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPlans } from '../api/plans'
import { useAuth } from '../auth/AuthContext'
import InstallCard from '../components/InstallCard'
import OutboxItem from '../components/OutboxItem'
import PlanCard from '../components/PlanCard'
import SavedDataNotice from '../components/SavedDataNotice'
import { EmptyState, ErrorState, Loading, SuccessMessage } from '../components/States'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { useLoad } from '../lib/useLoad'
import { useOutbox } from '../offline/outbox'
import { onWorkoutSent } from '../offline/sync'

// The List screen: my plans (table A) and the workouts (table B) under each.
export default function PlansPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { status, data: plans, error, savedAt, reload, setData } = useLoad(listPlans, 'plans')
  const [deletedNotice, setDeletedNotice] = useState(false)
  const outbox = useOutbox()

  // A waiting workout the server has just taken becomes a normal row under its plan.
  useEffect(
    () =>
      onWorkoutSent((row) => {
        setData((current) =>
          current?.map((plan) =>
            plan.id === row.plan_id && !plan.workouts.some((workout) => workout.id === row.id)
              ? { ...plan, workouts: [row, ...plan.workouts] }
              : plan,
          ) ?? current,
        )
      }),
    [setData],
  )

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

  // Waiting workouts go under their plan; the rest (their plan was deleted or
  // unassigned, or the plans can't be shown) get a card of their own. Nothing
  // extra shows while the plans load.
  const planIds = new Set(status === 'success' ? plans.map((plan) => plan.id) : [])
  const waitingFor = (planId) => outbox.filter((item) => item.workout.planId === planId)
  const orphans = status === 'loading' ? [] : outbox.filter((item) => !planIds.has(item.workout.planId))

  return (
    <section>
      <div className="page-head">
        <h1>{t('nav.myPlans')}</h1>
        <Link className="button" to="/plans/new">
          {t('plans.new')}
        </Link>
      </div>
      <InstallCard />
      {savedAt && <SavedDataNotice savedAt={savedAt} onRetry={reload} />}

      {deletedNotice && <SuccessMessage>{t('plans.deleted')}</SuccessMessage>}

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
          {t('plans.empty')}
        </EmptyState>
      )}

      {orphans.length > 0 && (
        <section className="card outbox-card">
          <h2>{t('outbox.cardTitle')}</h2>
          <ul className="workout-list">
            {orphans.map((item) => (
              <OutboxItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {status === 'success' && plans.length > 0 && (
        <ul className="plan-list">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              assigned={plan.user_id !== user?.id}
              waiting={waitingFor(plan.id)}
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
