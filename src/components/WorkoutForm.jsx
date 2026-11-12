import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createWorkout } from '../api/workouts'
import { friendlyError } from '../lib/errors'
import { ACTIVITIES } from '../lib/format'
import { toSetsPayload, validateExercises } from '../lib/sets'
import ExercisesEditor from './ExercisesEditor'
import { ErrorState, SuccessMessage } from './States'

const MAX_MINUTES = 1440
const MAX_KM = 1000

function validate({ title, type, minutes, distance, exercises }) {
  if (!title) return 'Enter a title.'
  if (!type) return 'Choose a type: Strength or Other.'
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
    return `Enter the duration in whole minutes (1–${MAX_MINUTES}).`
  }
  if (type === 'strength') return validateExercises(exercises)
  if (distance !== '' && !(Number(distance) > 0 && Number(distance) <= MAX_KM)) {
    return `Enter the distance in km (more than 0, up to ${MAX_KM}), or leave it empty.`
  }
  return ''
}

// Logs a workout (table B) with its sets or cardio details. Saving it is the
// "new record" that triggers the Supabase webhook → Zapier → the instructor's email.
export default function WorkoutForm({ plans, planId, onPlanChange }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [exercises, setExercises] = useState([])
  const [activity, setActivity] = useState('')
  const [distance, setDistance] = useState('')
  const [notes, setNotes] = useState('')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(null)

  async function save() {
    // Number('') is 0, so an empty duration fails the 1–1440 check too.
    const draft = { title: title.trim(), type, minutes: Number(duration), distance, exercises }
    const issue = validate(draft)
    setSaveError(null)
    setSaved(null)
    setProblem(issue)
    if (issue) return

    const cardio = type === 'other'
    setSaving(true)
    try {
      const row = await createWorkout({
        planId,
        title: draft.title,
        type,
        durationMin: draft.minutes,
        activity: cardio && activity ? activity : null,
        distanceKm: cardio && distance !== '' ? Number(distance) : null,
        notes: notes.trim() || null,
        sets: type === 'strength' ? toSetsPayload(exercises) : [],
      })
      setTitle('')
      setType('')
      setDuration('')
      setExercises([])
      setActivity('')
      setDistance('')
      setNotes('')
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

      {type === 'strength' && <ExercisesEditor exercises={exercises} onChange={setExercises} />}

      {type === 'other' && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="workout-activity">Activity</label>
            <select id="workout-activity" value={activity} onChange={(event) => setActivity(event.target.value)}>
              <option value="">—</option>
              {ACTIVITIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="workout-distance">Distance (km)</label>
            <input
              id="workout-distance"
              type="number"
              inputMode="decimal"
              min="0"
              max={MAX_KM}
              step="any"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
            />
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="workout-notes">Notes (optional)</label>
        <textarea
          id="workout-notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
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
          Workout saved: {saved.title}. <Link to={`/workouts/${saved.id}`}>Open it</Link> ·{' '}
          <Link to="/">See it in My plans</Link>
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
