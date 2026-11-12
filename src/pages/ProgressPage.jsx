import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProgress } from '../api/progress'
import GoalsCard from '../components/GoalsCard'
import MinutesChart from '../components/MinutesChart'
import ReportCard from '../components/ReportCard'
import { EmptyState, ErrorState, Loading } from '../components/States'
import Suggestions from '../components/Suggestions'
import WeightChart from '../components/WeightChart'
import { friendlyError } from '../lib/errors'
import { formatCalendarDay, formatDay, formatKg } from '../lib/format'
import { sortGoals } from '../lib/goals'
import { describeTrend, describeWeek, heaviestPerSession, weeklyMinutes, weightedExercises } from '../lib/progress'
import { suggest } from '../lib/recommendations'
import { useLoad } from '../lib/useLoad'

const WEEKS = 8

function WeightSection({ sets }) {
  const exercises = useMemo(() => weightedExercises(sets), [sets])
  const [chosen, setChosen] = useState('')
  const exercise = exercises.includes(chosen) ? chosen : (exercises[0] ?? '')
  const points = useMemo(() => (exercise ? heaviestPerSession(sets, exercise) : []), [sets, exercise])

  return (
    <section className="card stack" aria-labelledby="weight-title">
      <h2 id="weight-title">Heaviest set per session</h2>
      {exercises.length === 0 ? (
        <p className="muted">Log a strength workout with weights to see how your lifts change.</p>
      ) : (
        <>
          <div className="field chart-filter">
            <label htmlFor="progress-exercise">Exercise</label>
            <select id="progress-exercise" value={exercise} onChange={(event) => setChosen(event.target.value)}>
              {exercises.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <p className="chart-summary">{describeTrend(exercise, points)}</p>
          <WeightChart points={points} />
          <details className="table-view">
            <summary>Show as a table</summary>
            <table className="data-table">
              <caption className="visually-hidden">Heaviest set per session: {exercise}</caption>
              <thead>
                <tr>
                  <th scope="col">Session</th>
                  <th scope="col">Heaviest set</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.date}>
                    <th scope="row">{formatDay(point.date)}</th>
                    <td>{formatKg(point.kg)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}

function MinutesSection({ workouts }) {
  const weeks = useMemo(() => weeklyMinutes(workouts, { weeks: WEEKS }), [workouts])

  return (
    <section className="card stack" aria-labelledby="minutes-title">
      <h2 id="minutes-title">Minutes per week</h2>
      <p className="chart-summary">{describeWeek(weeks.at(-1))}</p>
      <MinutesChart weeks={weeks} />
      <details className="table-view">
        <summary>Show as a table</summary>
        <table className="data-table">
          <caption className="visually-hidden">Minutes per week</caption>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col">Strength</th>
              <th scope="col">Other</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart}>
                <th scope="row">{formatCalendarDay(week.weekStart)}</th>
                <td>{week.strength}</td>
                <td>{week.other}</td>
                <td>{week.strength + week.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

// Progress: suggestions, goals and the report to the instructor, then the
// heaviest set per session of one exercise and minutes per week.
export default function ProgressPage() {
  const { status, data, error, reload, setData } = useLoad(listProgress)
  const suggestions = useMemo(() => (data ? suggest(data) : []), [data])

  function addGoal(goal) {
    setData((current) => ({ ...current, goals: sortGoals([...current.goals, goal]) }))
  }

  function removeGoal(id) {
    setData((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }))
  }

  return (
    <section className="progress">
      <h1>Progress</h1>

      {status === 'loading' && <Loading>Loading your progress…</Loading>}

      {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

      {status === 'success' && data.workouts.length === 0 && (
        <EmptyState
          action={
            <Link className="button" to="/log">
              Log a workout
            </Link>
          }
        >
          No workouts yet — log one to see your progress.
        </EmptyState>
      )}

      {status === 'success' && data.workouts.length > 0 && (
        <div className="stack">
          <Suggestions items={suggestions} />
          <GoalsCard goals={data.goals} sets={data.sets} onAdded={addGoal} onRemoved={removeGoal} />
          <ReportCard />
          <WeightSection sets={data.sets} />
          <MinutesSection workouts={data.workouts} />
        </div>
      )}
    </section>
  )
}
