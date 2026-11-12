import { useState } from 'react'
import { Link } from 'react-router-dom'
import PlanForm from '../components/PlanForm'

// New plan: create a plan, then log a workout under it or go back to My plans.
export default function NewPlanPage() {
  const [created, setCreated] = useState(null)

  return (
    <section>
      <p className="back-link">
        <Link to="/">
          <span aria-hidden="true">← </span>Back to My plans
        </Link>
      </p>
      <h1>New plan</h1>

      <div className="card stack">
        <PlanForm onSaved={setCreated} />
        {created && (
          <div className="form-actions">
            <Link className="button" to={`/log?plan=${created.id}`}>
              Log a workout under it
            </Link>
            <Link className="button button-secondary" to="/">
              Go to My plans
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
