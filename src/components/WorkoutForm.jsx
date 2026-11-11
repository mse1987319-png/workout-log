import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createWorkout } from '../api/workouts'
import { friendlyError } from '../lib/errors'
import { ErrorState, SuccessMessage } from './States'

const MAX_MINUTES = 1440

function validate({ title, type, minutes }) {
  if (!title) return 'Enter a title.'
  if (!type) return 'Choose a type: Strength or Other.'
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
    return `Enter the duration in whole minutes (1–${MAX_MINUTES}).`
  }
  return ''
}

// Logs a workout (table B). Saving it is the "new record" that triggers
// the Supabase webhook → Zapier → the instructor's email.
export default function WorkoutForm({ plans, planId, onPlanChange }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(null)

  async function save() {
    // Number('') is 0, so an empty duration fails the 1–1440 check too.
    const workout = { title: title.trim(), type, minutes: Number(duration) }
    const issue = validate(workout)
    setSaveError(null)
    setSaved(null)
    setProblem(issue)
    if (issue) return

    setSaving(true)
    try {
      const row = await createWorkout({
        planId,
        title: workout.title,
        type,
        durationMin: workout.minutes,
      })
      setTitle('')
      setType('')
      setDuration('')
      setSaved(row)
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
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="workout-plan">Plan</label>
        <select id="workout-plan" value={planId} onChange={(event) => onPlanChange(event.target.value)}>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="workout-title">Title</label>
        <input
          id="workout-title"
          value={title}
          maxLength={100}
          placeholder="e.g. Leg day, 5 km run"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <fieldset className="field choice-group">
        <legend>Type</legend>
        <div className="choices">
          <label className="choice">
            <input
              type="radio"
              name="workout-type"
              value="strength"
              checked={type === 'strength'}
              onChange={() => setType('strength')}
            />
            Strength
          </label>
          <label className="choice">
            <input
              type="radio"
              name="workout-type"
              value="other"
              checked={type === 'other'}
              onChange={() => setType('other')}
            />
            Other (cardio, mobility…)
          </label>
        </div>
        <p className="hint">Your instructor gets an email about every workout; strength ones are flagged.</p>
      </fieldset>

      <div className="field">
        <label htmlFor="workout-duration">Duration (minutes)</label>
        <input
          id="workout-duration"
          type="number"
          inputMode="numeric"
          min="1"
          max={MAX_MINUTES}
          step="1"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </div>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
      {saved && (
        <SuccessMessage>
          Workout saved: {saved.title}. <Link to="/">See it in My plans</Link>
        </SuccessMessage>
      )}

      <div>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Saving…' : 'Save workout'}
        </button>
      </div>
    </form>
  )
}
