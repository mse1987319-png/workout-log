import { useState } from 'react'
import { renameWorkout } from '../api/workouts'
import { friendlyError } from '../lib/errors'
import { formatDateTime, TYPE_LABELS } from '../lib/format'
import { ErrorState, SuccessMessage } from './States'

// One logged workout, with an inline "Edit title" form. Renaming is an
// UPDATE: the webhook fires, and the Zapier Filter stops it (test 5).
export default function WorkoutItem({ workout, onRenamed }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const [saveError, setSaveError] = useState(null)
  const [renamed, setRenamed] = useState(false)

  function startEditing() {
    setDraft(workout.title)
    setProblem('')
    setSaveError(null)
    setRenamed(false)
    setEditing(true)
  }

  async function save() {
    const title = draft.trim()
    setSaveError(null)
    setProblem(title ? '' : 'Enter a title.')
    if (!title) return

    setSaving(true)
    try {
      const updated = await renameWorkout(workout.id, title)
      onRenamed(updated)
      setEditing(false)
      setRenamed(true)
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

  const meta = (
    <p className="workout-meta">
      <span className={`badge badge-${workout.type}`}>{TYPE_LABELS[workout.type] ?? workout.type}</span>
      <span>{workout.duration_min} min</span>
      <span>{formatDateTime(workout.created_at)}</span>
    </p>
  )

  if (editing) {
    const inputId = `workout-title-${workout.id}`
    return (
      <li className="workout">
        <form className="rename-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor={inputId} className="visually-hidden">
            Workout title
          </label>
          <input
            id={inputId}
            value={draft}
            maxLength={100}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="rename-actions">
            <button type="submit" className="button button-small" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
          {problem && (
            <p className="form-error" role="alert">
              {problem}
            </p>
          )}
          {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
        </form>
        {meta}
      </li>
    )
  }

  return (
    <li className="workout">
      <div className="workout-head">
        <span className="workout-title">{workout.title}</span>
        <button
          type="button"
          className="link-button"
          aria-label={`Edit title of ${workout.title}`}
          onClick={startEditing}
        >
          Edit title
        </button>
      </div>
      {meta}
      {renamed && <SuccessMessage>Title updated.</SuccessMessage>}
    </li>
  )
}
