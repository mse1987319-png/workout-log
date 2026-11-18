import { useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { ACTIVITY_VALUES, activityLabel, typeLabel } from '../lib/format'
import { toSetsPayload, validateExercises } from '../lib/sets'
import { getCurrentUser } from '../offline/currentUser'
import { clearDraft, readDraft, saveDraft } from '../offline/draft'
import { saveWorkout } from '../offline/sync'
import ExercisesEditor from './ExercisesEditor'
import { withFreshKeys } from './exerciseKeys'
import { ErrorState, SuccessMessage } from './States'

const MAX_MINUTES = 1440
const MAX_KM = 1000

const EMPTY_FIELDS = { title: '', type: '', duration: '', exercises: [], activity: '', distance: '', notes: '' }

// The unsaved workout kept on the phone, as the form's fields, or null.
function restoredFields() {
  const draft = readDraft()
  if (!draft) return null
  const { title, type, duration, exercises, activity, distance, notes } = { ...EMPTY_FIELDS, ...draft }
  return { title, type, duration, exercises: withFreshKeys(exercises), activity, distance, notes }
}

// Only typed content makes a draft: choosing a plan alone is not one.
const isBlank = ({ exercises, ...text }) => exercises.length === 0 && Object.values(text).every((value) => value === '')

function validate({ title, type, minutes, distance, exercises }) {
  if (!title) return t('workout.enterTitle')
  if (!type) return t('workout.chooseType')
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
    return t('workout.badDuration', { max: MAX_MINUTES })
  }
  if (type === 'strength') return validateExercises(exercises)
  if (distance !== '' && !(Number(distance) > 0 && Number(distance) <= MAX_KM)) {
    return t('workout.badDistance', { max: MAX_KM })
  }
  return ''
}

// Logs a workout (table B) with its sets or cardio details. Saving it is the
// "new record" that triggers the Supabase webhook → Zapier → the instructor's email.
export default function WorkoutForm({ plans, planId, onPlanChange }) {
  const [restoredDraft] = useState(restoredFields)
  const [fields, setFields] = useState(restoredDraft ?? EMPTY_FIELDS)
  const [restored, setRestored] = useState(restoredDraft !== null)
  const { title, type, duration, exercises, activity, distance, notes } = fields
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [outcome, setOutcome] = useState(null)
  useLanguage() // re-render when the language changes

  // Every change is kept on the phone as the draft (an empty form keeps none),
  // except while saving: saveWorkout drops the draft once the outbox has the
  // workout, and a change then (a field blurred as the form locks) must not
  // bring it back. A refused save writes it again itself.
  function change(patch, plan = planId) {
    const next = { ...fields, ...patch }
    setFields(next)
    if (saving) return
    if (isBlank(next)) clearDraft()
    else saveDraft({ planId: plan, ...next })
  }

  function startOver() {
    setFields(EMPTY_FIELDS)
    setRestored(false)
    clearDraft()
  }

  async function save() {
    // Number('') is 0, so an empty duration fails the 1–1440 check too.
    const entered = { title: title.trim(), type, minutes: Number(duration), distance, exercises }
    const issue = validate(entered)
    setSaveError(null)
    setOutcome(null)
    setProblem(issue)
    if (issue) return

    const cardio = type === 'other'
    // Whose form this is: the save can outlast a log out (and someone else's log in).
    const owner = getCurrentUser()
    setSaving(true)
    try {
      const result = await saveWorkout({
        workout: {
          planId,
          title: entered.title,
          type,
          durationMin: entered.minutes,
          activity: cardio && activity ? activity : null,
          distanceKm: cardio && distance !== '' ? Number(distance) : null,
          notes: notes.trim() || null,
          sets: type === 'strength' ? toSetsPayload(exercises) : [],
        },
        planName: plans.find((plan) => plan.id === planId)?.name,
      })
      setFields(EMPTY_FIELDS)
      setRestored(false)
      clearDraft(owner)
      setOutcome(result)
    } catch (error) {
      // Not kept after all (refused, or the phone is full), and the fields stay
      // for a fix: they are the draft again, which saveWorkout dropped when the
      // outbox took the workout. Only while the same person is signed in.
      if (getCurrentUser() === owner) saveDraft({ planId, ...fields })
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
      {/* Locked while saving: the form clears when the workout is saved or
          kept, so anything typed meanwhile would be lost without a word. */}
      <fieldset className="form-fields" disabled={saving}>
        {restored && (
          <p className="state state-restored" role="status">
            {t('workout.draftRestored')}{' '}
            <button type="button" className="link-button" onClick={startOver}>
              {t('workout.startOver')}
            </button>
          </p>
        )}

        <div className="field">
          <label htmlFor="workout-plan">{t('workout.plan')}</label>
          <select id="workout-plan" value={planId} onChange={(event) => {
              onPlanChange(event.target.value)
              change({}, event.target.value)
            }}
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="workout-title">{t('workout.titleLabel')}</label>
          <input
            id="workout-title"
            value={title}
            maxLength={100}
            placeholder={t('workout.titlePlaceholder')}
            onChange={(event) => change({ title: event.target.value })}
          />
        </div>

        <fieldset className="field choice-group">
          <legend>{t('workout.type')}</legend>
          <div className="choices">
            <label className="choice">
              <input
                type="radio"
                name="workout-type"
                value="strength"
                checked={type === 'strength'}
                onChange={() => change({ type: 'strength' })}
              />
              {typeLabel('strength')}
            </label>
            <label className="choice">
              <input
                type="radio"
                name="workout-type"
                value="other"
                checked={type === 'other'}
                onChange={() => change({ type: 'other' })}
              />
              {t('workout.typeOtherLong')}
            </label>
          </div>
          <p className="hint">{t('workout.typeHint')}</p>
        </fieldset>

        <div className="field">
          <label htmlFor="workout-duration">{t('workout.duration')}</label>
          <input
            id="workout-duration"
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_MINUTES}
            step="1"
            value={duration}
            onChange={(event) => change({ duration: event.target.value })}
          />
        </div>

        {type === 'strength' && <ExercisesEditor exercises={exercises} onChange={(next) => change({ exercises: next })} />}

        {type === 'other' && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="workout-activity">{t('workout.activity')}</label>
              <select id="workout-activity" value={activity} onChange={(event) => change({ activity: event.target.value })}>
                <option value="">—</option>
                {ACTIVITY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {activityLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="workout-distance">{t('workout.distance')}</label>
              <input
                id="workout-distance"
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_KM}
                step="any"
                value={distance}
                onChange={(event) => change({ distance: event.target.value })}
              />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="workout-notes">{t('workout.notes')}</label>
          <textarea
            id="workout-notes"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(event) => change({ notes: event.target.value })}
          />
        </div>
      </fieldset>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
      {outcome?.saved && (
        <SuccessMessage>
          {t('workout.saved', { title: outcome.saved.title })}{' '}
          <Link to={`/workouts/${outcome.saved.id}`}>{t('workout.openIt')}</Link> ·{' '}
          <Link to="/">{t('workout.seeInPlans')}</Link>
        </SuccessMessage>
      )}
      {outcome?.kept && (
        <SuccessMessage>
          {t('workout.kept')} <Link to="/">{t('workout.seeInPlans')}</Link>
        </SuccessMessage>
      )}

      <div>
        <button type="submit" className="button" disabled={saving}>
          {saving ? t('common.saving') : t('workout.submit')}
        </button>
      </div>
    </form>
  )
}
