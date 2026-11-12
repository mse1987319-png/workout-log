import { useEffect, useId, useRef, useState } from 'react'
import { createPlan, updatePlan } from '../api/plans'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { ErrorState, SuccessMessage } from './States'

// The plan form (table A). Without `plan` it creates one; with `plan` it
// edits that plan (name and goal) and offers Cancel. `onSaved(plan)` gets the
// saved row either way.
export default function PlanForm({ plan = null, onSaved, onCancel }) {
  const editing = plan !== null
  const id = useId()
  const nameRef = useRef(null)
  const [name, setName] = useState(plan?.name ?? '')
  const [goal, setGoal] = useState(plan?.goal ?? '')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [created, setCreated] = useState(null)
  useLanguage() // re-render when the language changes

  useEffect(() => {
    if (editing) nameRef.current?.focus()
  }, [editing])

  async function save() {
    const cleanName = name.trim()
    const cleanGoal = goal.trim() || null
    setSaveError(null)
    setCreated(null)
    setProblem(cleanName ? '' : t('plan.enterName'))
    if (!cleanName) return

    setSaving(true)
    try {
      const saved = editing
        ? await updatePlan({ id: plan.id, name: cleanName, goal: cleanGoal })
        : await createPlan({ name: cleanName, goal: cleanGoal })
      if (!editing) {
        setName('')
        setGoal('')
        setCreated(saved)
      }
      onSaved(saved)
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

  let submitLabel = editing ? t('plan.savePlan') : t('plan.createPlan')
  if (saving) submitLabel = editing ? t('common.saving') : t('plan.creating')

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>{t('plan.nameLabel')}</label>
        <input
          id={`${id}-name`}
          ref={nameRef}
          value={name}
          maxLength={100}
          placeholder={t('plan.namePlaceholder')}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-goal`}>{t('plan.goalLabel')}</label>
        <input
          id={`${id}-goal`}
          value={goal}
          maxLength={300}
          placeholder={t('plan.goalPlaceholder')}
          onChange={(event) => setGoal(event.target.value)}
        />
      </div>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
      {created && <SuccessMessage>{t('plan.created', { name: created.name })}</SuccessMessage>}

      <div className="form-actions">
        <button type="submit" className="button" disabled={saving}>
          {submitLabel}
        </button>
        {editing && (
          <button type="button" className="button button-secondary" disabled={saving} onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
