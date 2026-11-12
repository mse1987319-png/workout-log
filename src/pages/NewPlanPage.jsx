import { useState } from 'react'
import { Link } from 'react-router-dom'
import PlanForm from '../components/PlanForm'
import { useLanguage } from '../i18n/useLanguage'

// New plan: create a plan, then log a workout under it or go back to My plans.
export default function NewPlanPage() {
  const [created, setCreated] = useState(null)
  const { t } = useLanguage()

  return (
    <section>
      <p className="back-link">
        <Link to="/">
          <span aria-hidden="true">← </span>
          {t('newPlan.back')}
        </Link>
      </p>
      <h1>{t('plans.new')}</h1>

      <div className="card stack">
        <PlanForm onSaved={setCreated} />
        {created && (
          <div className="form-actions">
            <Link className="button" to={`/log?plan=${created.id}`}>
              {t('newPlan.logUnder')}
            </Link>
            <Link className="button button-secondary" to="/">
              {t('newPlan.goToPlans')}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
