import { useState } from 'react'
import { createPlan } from '../api/plans'
import { friendlyError } from '../lib/errors'
import { ErrorState, SuccessMessage } from './States'

// Creates a plan (table A). `nameRef` lets the page focus the name field.
export default function PlanForm({ nameRef, onCreated }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [created, setCreated] = useState(null)

  async function save() {
    const cleanName = name.trim()
    setSaveError(null)
    setCreated(null)
    setProblem(cleanName ? '' : 'Enter a plan name.')
    if (!cleanName) return

    setSaving(true)
    try {
      const plan = await createPlan({ name: cleanName, goal: goal.trim() || null })
      setName('')
      setGoal('')
      setCreated(plan)
      onCreated(plan)
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
        <label htmlFor="plan-name">Plan name</label>
        <input
          id="plan-name"
          ref={nameRef}
          value={name}
          maxLength={100}
          placeholder="e.g. Strength block"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="plan-goal">Goal (optional)</label>
        <input
          id="plan-goal"
          value={goal}
          maxLength={300}
          placeholder="e.g. Squat 100 kg by March"
          onChange={(event) => setGoal(event.target.value)}
        />
      </div>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
      {created && <SuccessMessage>Plan created: {created.name}.</SuccessMessage>}

      <div>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Creating…' : 'Create plan'}
        </button>
      </div>
    </form>
  )
}
