import { useState } from 'react'
import { Link } from 'react-router-dom'
import { renameWorkout } from '../api/workouts'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { formatDateTime, typeLabel } from '../lib/format'
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
  useLanguage() // re-render when the language changes

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
    setProblem(title ? '' : t('workout.enterTitle'))
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
      <span className={`badge badge-${workout.type}`}>{typeLabel(workout.type)}</span>
      <span>{t('unit.min', { count: workout.duration_min })}</span>
      <span>{formatDateTime(workout.created_at)}</span>
    </p>
  )

  if (editing) {
    const inputId = `workout-title-${workout.id}`
    return (
      <li className="workout">
        <form className="rename-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor={inputId} className="visually-hidden">
            {t('workout.titleLabelHidden')}
          </label>
          <input
            id={inputId}
            value={draft}
            maxLength={100}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="rename-actions">
            <button type="submit" className="button button-small" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              {t('common.cancel')}
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
        <Link className="workout-title" to={`/workouts/${workout.id}`}>
          {workout.title}
        </Link>
        <button
          type="button"
          className="link-button"
          aria-label={t('workout.editTitleLabel', { title: workout.title })}
          onClick={startEditing}
        >
          {t('workout.editTitle')}
        </button>
      </div>
      {meta}
      {renamed && <SuccessMessage>{t('workout.titleUpdated')}</SuccessMessage>}
    </li>
  )
}
