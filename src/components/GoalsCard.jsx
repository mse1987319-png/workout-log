import { useMemo, useState } from 'react'
import { createGoal, deleteGoal } from '../api/goals'
import { friendlyError } from '../lib/errors'
import { formatCalendarDay, formatKg } from '../lib/format'
import { describeGoal, goalName, goalStatus, toYmd, validateGoal } from '../lib/goals'
import { weightedExercises } from '../lib/progress'
import { ErrorState, SuccessMessage } from './States'

// One goal: the heaviest set so far against the target, as a bar on a kg
// scale from 0 to the target, with the numbers beside it.
function GoalRow({ goal, sets, onRemoved, readOnly }) {
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const status = goalStatus(goal, sets)
  const label = `${goalName(goal)} by ${formatCalendarDay(goal.target_date)}`

  async function remove() {
    setRemoveError(null)
    setRemoving(true)
    try {
      await deleteGoal(goal.id)
      onRemoved(goal.id)
    } catch (error) {
      setRemoveError(error)
      setRemoving(false)
    }
  }

  return (
    <li className={`goal goal-${status.state}`}>
      <div className="goal-head">
        <span className="goal-name">{label}</span>
        <span className="goal-figure">
          {formatKg(status.best)} / {formatKg(status.target)} kg
        </span>
      </div>
      <div
        className="goal-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={status.target}
        aria-valuenow={Math.min(status.best, status.target)}
        aria-valuetext={`${formatKg(status.best)} of ${formatKg(status.target)} kg`}
      >
        <div className="goal-fill" style={{ width: `${status.share * 100}%` }} />
      </div>
      <div className="goal-foot">
        <p className="goal-status">
          {status.state === 'reached' && <span aria-hidden="true">✓ </span>}
          {describeGoal(goal, status)}
        </p>
        {!readOnly && (
          <button
            type="button"
            className="button button-secondary button-small"
            aria-label={`Remove goal: ${label}`}
            disabled={removing}
            onClick={remove}
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
      {removeError && <ErrorState message={friendlyError(removeError)} onRetry={remove} />}
    </li>
  )
}

function GoalForm({ exercises, onAdded }) {
  const [today] = useState(() => toYmd(new Date()))
  const [exercise, setExercise] = useState('')
  const [targetKg, setTargetKg] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [added, setAdded] = useState(null)

  async function save() {
    setSaveError(null)
    setAdded(null)
    const issue = validateGoal({ exercise, targetKg, targetDate })
    setProblem(issue)
    if (issue) return

    setSaving(true)
    try {
      const goal = await createGoal({ exercise: exercise.trim(), targetKg: Number(targetKg), targetDate })
      setExercise('')
      setTargetKg('')
      setTargetDate('')
      setAdded(goal)
      onAdded(goal)
    } catch (error) {
      setSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    save()
  }

  return (
    <form className="form goal-form" onSubmit={handleSubmit} noValidate aria-labelledby="goal-form-title">
      <h3 id="goal-form-title">New goal</h3>
      <div className="field-row">
        <div className="field">
          <label htmlFor="goal-exercise">Exercise</label>
          <input
            id="goal-exercise"
            list="goal-exercises"
            value={exercise}
            maxLength={60}
            autoComplete="off"
            placeholder="e.g. Squat"
            onChange={(event) => setExercise(event.target.value)}
          />
          <datalist id="goal-exercises">
            {exercises.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="goal-kg">Target (kg)</label>
          <input
            id="goal-kg"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={targetKg}
            placeholder="e.g. 120"
            onChange={(event) => setTargetKg(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="goal-date">Reach it by</label>
          <input
            id="goal-date"
            type="date"
            min={today}
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </div>
      </div>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
      {added && (
        <SuccessMessage>
          Goal added: {goalName(added)} by {formatCalendarDay(added.target_date)}.
        </SuccessMessage>
      )}

      <div>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Adding…' : 'Add goal'}
        </button>
      </div>
    </form>
  )
}

// Goals on the Progress screen: a bar per goal, and the form to add one.
// readOnly (the instructor's view of an athlete): bars only.
export default function GoalsCard({ goals, sets, onAdded, onRemoved, readOnly = false }) {
  const exercises = useMemo(() => weightedExercises(sets), [sets])

  return (
    <section className="card stack" aria-labelledby="goals-title">
      <h2 id="goals-title">Goals</h2>

      {goals.length === 0 ? (
        <p className="muted">
          {readOnly ? 'No goals yet.' : 'No goals yet. Set one below: an exercise, a weight and a date.'}
        </p>
      ) : (
        <ul className="goal-list" aria-labelledby="goals-title">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} sets={sets} onRemoved={onRemoved} readOnly={readOnly} />
          ))}
        </ul>
      )}

      {!readOnly && <GoalForm exercises={exercises} onAdded={onAdded} />}
    </section>
  )
}
