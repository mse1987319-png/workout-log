import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPlanOptions } from '../api/plans'
import { assignPlan, getAthleteProgress, listAssignments, unassignPlan } from '../api/sharing'
import GoalsCard from '../components/GoalsCard'
import { MinutesSection, WeightSection } from '../components/ProgressCharts'
import { ErrorState, Loading, SuccessMessage } from '../components/States'
import Suggestions from '../components/Suggestions'
import { friendlyError } from '../lib/errors'
import { ACTIVITIES, formatDateTime, formatDay, formatKg, TYPE_LABELS } from '../lib/format'
import { suggest } from '../lib/recommendations'
import { useLoad } from '../lib/useLoad'

const RECENT = 10
const activityLabel = (value) => ACTIVITIES.find(([key]) => key === value)?.[1]

function AssignedPlans({ athleteId, plans, assignments, onAssigned, onUnassigned }) {
  const available = plans.filter((plan) => !assignments.some((assignment) => assignment.plan_id === plan.id))
  const [chosen, setChosen] = useState('')
  const planId = available.some((plan) => plan.id === chosen) ? chosen : (available[0]?.id ?? '')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [assigned, setAssigned] = useState(null)
  const [unassigning, setUnassigning] = useState('')
  const [unassignError, setUnassignError] = useState(null)

  async function assign() {
    setAssignError(null)
    setAssigned(null)
    setAssigning(true)
    try {
      const assignment = await assignPlan({ planId, athleteId })
      setAssigned(assignment)
      onAssigned(assignment)
    } catch (error) {
      setAssignError(error)
    } finally {
      setAssigning(false)
    }
  }

  async function unassign(id) {
    setUnassignError(null)
    setAssigned(null)
    setUnassigning(id)
    try {
      await unassignPlan({ planId: id, athleteId })
      onUnassigned(id)
    } catch (error) {
      setUnassignError({ planId: id, error })
    } finally {
      setUnassigning('')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    assign()
  }

  return (
    <section className="card stack" aria-labelledby="assigned-title">
      <h2 id="assigned-title">Plans you assigned</h2>

      {assignments.length === 0 ? (
        <p className="muted">No plans assigned yet.</p>
      ) : (
        <ul className="person-list" aria-labelledby="assigned-title">
          {assignments.map((assignment) => (
            <li key={assignment.plan_id} className="person-head">
              <span className="person-email">{assignment.plan.name}</span>
              <button
                type="button"
                className="button button-secondary button-small"
                aria-label={`Unassign ${assignment.plan.name}`}
                disabled={unassigning === assignment.plan_id}
                onClick={() => unassign(assignment.plan_id)}
              >
                {unassigning === assignment.plan_id ? 'Unassigning…' : 'Unassign'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {unassignError && (
        <ErrorState message={friendlyError(unassignError.error)} onRetry={() => unassign(unassignError.planId)} />
      )}

      {plans.length === 0 && (
        <p className="muted">
          <Link to="/plans/new">Create a plan</Link> first, then assign it here.
        </p>
      )}
      {plans.length > 0 && available.length === 0 && (
        <p className="muted">All your plans are assigned to this athlete.</p>
      )}
      {available.length > 0 && (
        <form className="assign-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="assign-plan">Plan</label>
            <select id="assign-plan" value={planId} onChange={(event) => setChosen(event.target.value)}>
              {available.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button type="submit" className="button" disabled={assigning}>
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      )}
      {assignError && <ErrorState message={friendlyError(assignError)} onRetry={assign} />}
      {assigned && <SuccessMessage>Assigned {assigned.plan.name}: the athlete sees it under My plans.</SuccessMessage>}
    </section>
  )
}

function RecentWorkouts({ workouts }) {
  const recent = [...workouts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, RECENT)

  return (
    <section className="card stack" aria-labelledby="recent-title">
      <h2 id="recent-title">Recent workouts</h2>
      {recent.length === 0 ? (
        <p className="muted">No workouts yet.</p>
      ) : (
        <ul className="person-list" aria-labelledby="recent-title">
          {recent.map((workout) => (
            <li key={workout.id} className="person-row">
              <p className="workout-meta">
                <span className="person-email">{workout.title}</span>
                <span className={`badge badge-${workout.type}`}>{TYPE_LABELS[workout.type] ?? workout.type}</span>
              </p>
              <p className="muted">
                {formatDay(workout.created_at)} · {workout.duration_min} min
                {workout.activity && ` · ${activityLabel(workout.activity) ?? workout.activity}`}
                {workout.distance_km && ` · ${formatKg(workout.distance_km)} km`}
                {workout.plan_name && ` · ${workout.plan_name}`}
              </p>
              {workout.sets_summary && <p>{workout.sets_summary}</p>}
              {workout.notes && <p className="muted">“{workout.notes}”</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Reports({ reports }) {
  return (
    <section className="card stack" aria-labelledby="reports-title">
      <h2 id="reports-title">Reports</h2>
      {reports.length === 0 ? (
        <p className="muted">No reports sent yet.</p>
      ) : (
        <ul className="person-list" aria-labelledby="reports-title">
          {reports.map((report) => (
            <li key={report.created_at} className="person-row">
              <p className="muted">Sent {formatDateTime(report.created_at)}</p>
              <p>{report.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// One athlete, for their instructor: assign plans, and read (never change)
// their progress. The data comes from athlete_progress(), which the database
// refuses unless this athlete shares with the signed-in instructor.
export default function AthletePage() {
  const { id } = useParams()
  const load = useCallback(
    () =>
      Promise.all([getAthleteProgress(id), listAssignments(id), listPlanOptions()]).then(
        ([progress, assignments, plans]) => ({ progress, assignments, plans }),
      ),
    [id],
  )
  const { status, data, error, reload, setData } = useLoad(load)
  const suggestions = useMemo(() => (data ? suggest(data.progress) : []), [data])

  function addAssignment(assignment) {
    setData((current) => ({ ...current, assignments: [...current.assignments, assignment] }))
  }

  function removeAssignment(planId) {
    setData((current) => ({
      ...current,
      assignments: current.assignments.filter((assignment) => assignment.plan_id !== planId),
    }))
  }

  return (
    <section>
      <p className="back-link">
        <Link to="/athletes">
          <span aria-hidden="true">← </span>Back to My athletes
        </Link>
      </p>

      {status === 'loading' && <Loading>Loading the athlete…</Loading>}

      {status === 'error' &&
        (error?.code === '42501' ? (
          <ErrorState message="This athlete isn't sharing with you." />
        ) : (
          <ErrorState message={friendlyError(error)} onRetry={reload} />
        ))}

      {status === 'success' && (
        <>
          <h1>{data.progress.athlete.email}</h1>
          <p className="page-intro">Sharing with you since {formatDay(data.progress.linked_at)}.</p>
          <div className="stack">
            <AssignedPlans
              athleteId={id}
              plans={data.plans}
              assignments={data.assignments}
              onAssigned={addAssignment}
              onUnassigned={removeAssignment}
            />
            <Suggestions items={suggestions} title="Suggestions for this athlete" readOnly />
            <GoalsCard goals={data.progress.goals} sets={data.progress.sets} readOnly />
            <RecentWorkouts workouts={data.progress.workouts} />
            <Reports reports={data.progress.reports} />
            <WeightSection sets={data.progress.sets} emptyText="No strength workouts with weights yet." />
            <MinutesSection workouts={data.progress.workouts} />
          </div>
        </>
      )}
    </section>
  )
}
