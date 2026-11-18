import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPlanOptions } from '../api/plans'
import { assignPlan, getAthleteProgress, listAssignments, unassignPlan } from '../api/sharing'
import GoalsCard from '../components/GoalsCard'
import { MinutesSection, WeightSection } from '../components/ProgressCharts'
import SavedDataNotice from '../components/SavedDataNotice'
import { ErrorState, Loading, SuccessMessage } from '../components/States'
import Suggestions from '../components/Suggestions'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { activityLabel, formatDateTime, formatDay, formatKg, typeLabel } from '../lib/format'
import { suggest } from '../lib/recommendations'
import { useLoad } from '../lib/useLoad'

const RECENT = 10

function AssignedPlans({ athleteId, plans, assignments, onAssigned, onUnassigned }) {
  const { t } = useLanguage()
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
      <h2 id="assigned-title">{t('athlete.assignedTitle')}</h2>

      {assignments.length === 0 ? (
        <p className="muted">{t('athlete.noAssigned')}</p>
      ) : (
        <ul className="person-list" aria-labelledby="assigned-title">
          {assignments.map((assignment) => (
            <li key={assignment.plan_id} className="person-head">
              <span className="person-email">{assignment.plan.name}</span>
              <button
                type="button"
                className="button button-secondary button-small"
                aria-label={t('athlete.unassignLabel', { name: assignment.plan.name })}
                disabled={unassigning === assignment.plan_id}
                onClick={() => unassign(assignment.plan_id)}
              >
                {unassigning === assignment.plan_id ? t('athlete.unassigning') : t('athlete.unassign')}
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
          <Link to="/plans/new">{t('athlete.createPlanLink')}</Link>
          {t('athlete.createPlanRest')}
        </p>
      )}
      {plans.length > 0 && available.length === 0 && (
        <p className="muted">{t('athlete.allAssigned')}</p>
      )}
      {available.length > 0 && (
        <form className="assign-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="assign-plan">{t('athlete.plan')}</label>
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
              {assigning ? t('athlete.assigning') : t('athlete.assign')}
            </button>
          </div>
        </form>
      )}
      {assignError && <ErrorState message={friendlyError(assignError)} onRetry={assign} />}
      {assigned && <SuccessMessage>{t('athlete.assigned', { name: assigned.plan.name })}</SuccessMessage>}
    </section>
  )
}

function RecentWorkouts({ workouts }) {
  const { t } = useLanguage()
  const recent = [...workouts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, RECENT)

  return (
    <section className="card stack" aria-labelledby="recent-title">
      <h2 id="recent-title">{t('athlete.recentTitle')}</h2>
      {recent.length === 0 ? (
        <p className="muted">{t('athlete.noWorkouts')}</p>
      ) : (
        <ul className="person-list" aria-labelledby="recent-title">
          {recent.map((workout) => (
            <li key={workout.id} className="person-row">
              <p className="workout-meta">
                <span className="person-email">{workout.title}</span>
                <span className={`badge badge-${workout.type}`}>{typeLabel(workout.type)}</span>
              </p>
              <p className="muted">
                {formatDay(workout.created_at)} · {t('unit.min', { count: workout.duration_min })}
                {workout.activity && ` · ${activityLabel(workout.activity)}`}
                {workout.distance_km && ` · ${formatKg(workout.distance_km)} km`}
                {workout.plan_name && ` · ${workout.plan_name}`}
              </p>
              {workout.sets_summary && <p>{workout.sets_summary}</p>}
              {workout.notes && <p className="muted">{t('common.quoted', { text: workout.notes })}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Reports({ reports }) {
  const { t } = useLanguage()
  return (
    <section className="card stack" aria-labelledby="reports-title">
      <h2 id="reports-title">{t('athlete.reportsTitle')}</h2>
      {reports.length === 0 ? (
        <p className="muted">{t('athlete.noReports')}</p>
      ) : (
        <ul className="person-list" aria-labelledby="reports-title">
          {reports.map((report) => (
            <li key={report.created_at} className="person-row">
              <p className="muted">{t('athlete.reportSent', { date: formatDateTime(report.created_at) })}</p>
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
  const { status, data, error, savedAt, reload, setData } = useLoad(load, `athlete:${id}`)
  const { language, t } = useLanguage()
  // The suggestions are worded in the current language, so they are redone when it changes.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => (data ? suggest(data.progress) : []), [data, language])

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
          <span aria-hidden="true">← </span>
          {t('athlete.back')}
        </Link>
      </p>

      {status === 'loading' && <Loading>{t('athlete.loading')}</Loading>}

      {status === 'error' &&
        (error?.code === '42501' ? (
          <ErrorState message={t('athlete.notSharing')} />
        ) : (
          <ErrorState message={friendlyError(error)} onRetry={reload} />
        ))}

      {status === 'success' && (
        <>
          <h1>{data.progress.athlete.email}</h1>
          {savedAt && <SavedDataNotice savedAt={savedAt} onRetry={reload} />}
          <p className="page-intro">{t('athlete.sharingSince', { date: formatDay(data.progress.linked_at) })}</p>
          <div className="stack">
            <AssignedPlans
              athleteId={id}
              plans={data.plans}
              assignments={data.assignments}
              onAssigned={addAssignment}
              onUnassigned={removeAssignment}
            />
            <Suggestions items={suggestions} title={t('athlete.suggestionsTitle')} readOnly />
            <GoalsCard goals={data.progress.goals} sets={data.progress.sets} readOnly />
            <RecentWorkouts workouts={data.progress.workouts} />
            <Reports reports={data.progress.reports} />
            <WeightSection sets={data.progress.sets} emptyText={t('athlete.noWeights')} />
            <MinutesSection workouts={data.progress.workouts} />
          </div>
        </>
      )}
    </section>
  )
}
