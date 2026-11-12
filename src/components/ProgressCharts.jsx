import { useMemo, useState } from 'react'
import { formatCalendarDay, formatDay, formatKg } from '../lib/format'
import { describeTrend, describeWeek, heaviestPerSession, weeklyMinutes, weightedExercises } from '../lib/progress'
import MinutesChart from './MinutesChart'
import WeightChart from './WeightChart'

// The two charts of the Progress screen, each with a one-line summary and a
// table view. The instructor's view of an athlete reuses them.

const WEEKS = 8

export function WeightSection({ sets, emptyText = 'Log a strength workout with weights to see how your lifts change.' }) {
  const exercises = useMemo(() => weightedExercises(sets), [sets])
  const [chosen, setChosen] = useState('')
  const exercise = exercises.includes(chosen) ? chosen : (exercises[0] ?? '')
  const points = useMemo(() => (exercise ? heaviestPerSession(sets, exercise) : []), [sets, exercise])

  return (
    <section className="card stack" aria-labelledby="weight-title">
      <h2 id="weight-title">Heaviest set per session</h2>
      {exercises.length === 0 ? (
        <p className="muted">{emptyText}</p>
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

export function MinutesSection({ workouts }) {
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
