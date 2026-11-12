import { useState } from 'react'
import { linkInstructor, listMyInstructors, stopSharing } from '../api/sharing'
import { ErrorState, Loading, SuccessMessage } from '../components/States'
import { friendlyError } from '../lib/errors'
import { formatDay } from '../lib/format'
import { useLoad } from '../lib/useLoad'

// Codes the database refuses on purpose: show the reason, there's nothing to retry.
const REFUSED = new Set(['P0002', '22023'])

function InstructorRow({ instructor, onStopped }) {
  const [stopping, setStopping] = useState(false)
  const [stopError, setStopError] = useState(null)

  async function stop() {
    setStopError(null)
    setStopping(true)
    try {
      await stopSharing(instructor.instructor_id)
      onStopped(instructor.instructor_id)
    } catch (error) {
      setStopError(error)
      setStopping(false)
    }
  }

  return (
    <li className="person-row">
      <div className="person-head">
        <div>
          <p className="person-email">{instructor.email}</p>
          <p className="muted">Sharing since {formatDay(instructor.linked_at)}</p>
        </div>
        <button
          type="button"
          className="button button-secondary button-small"
          aria-label={`Stop sharing with ${instructor.email}`}
          disabled={stopping}
          onClick={stop}
        >
          {stopping ? 'Stopping…' : 'Stop sharing'}
        </button>
      </div>
      {stopError && <ErrorState message={friendlyError(stopError)} onRetry={stop} />}
    </li>
  )
}

function ShareForm({ onLinked }) {
  const [code, setCode] = useState('')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [linked, setLinked] = useState(null)

  async function save() {
    const clean = code.trim()
    setSaveError(null)
    setLinked(null)
    setProblem(clean ? '' : 'Enter the code your instructor gave you.')
    if (!clean) return

    setSaving(true)
    try {
      const instructor = await linkInstructor(clean)
      setCode('')
      setLinked(instructor)
      onLinked(instructor)
    } catch (error) {
      if (REFUSED.has(error.code)) setProblem(error.message)
      else setSaveError(error)
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
      <div className="field code-field">
        <label htmlFor="instructor-code">Instructor&apos;s code</label>
        <input
          id="instructor-code"
          value={code}
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. K7P2QX"
          aria-describedby="instructor-code-hint"
          onChange={(event) => setCode(event.target.value)}
        />
        <p className="hint" id="instructor-code-hint">
          Six letters and digits; your instructor sees it on their My athletes screen.
        </p>
      </div>

      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      {saveError && <ErrorState message={friendlyError(saveError)} onRetry={save} />}
      {linked && <SuccessMessage>You now share with {linked.email}.</SuccessMessage>}

      <div>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Sharing…' : 'Share'}
        </button>
      </div>
    </form>
  )
}

// Sharing (athletes): share with an instructor by code, see who you share
// with, and stop. Instructors can read what you share, never change it.
export default function SharingPage() {
  const { status, data: instructors, error, reload, setData } = useLoad(listMyInstructors)

  function addInstructor(linked) {
    setData((current) =>
      !current || current.some((row) => row.instructor_id === linked.instructor_id) ? current : [...current, linked],
    )
  }

  function removeInstructor(instructorId) {
    setData((current) => current.filter((row) => row.instructor_id !== instructorId))
  }

  return (
    <section>
      <h1>Sharing</h1>
      <p className="page-intro">
        Share your workouts, sets, goals and reports with an instructor. They can read them, never change them, and
        you can stop at any time.
      </p>

      <div className="stack">
        <section className="card stack" aria-labelledby="share-title">
          <h2 id="share-title">Share with an instructor</h2>
          <ShareForm onLinked={addInstructor} />
        </section>

        <section className="card stack" aria-labelledby="shared-title">
          <h2 id="shared-title">Who you share with</h2>

          {status === 'loading' && <Loading>Loading who you share with…</Loading>}

          {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

          {status === 'success' && instructors.length === 0 && (
            <p className="muted">You don&apos;t share with an instructor yet.</p>
          )}

          {status === 'success' && instructors.length > 0 && (
            <ul className="person-list" aria-labelledby="shared-title">
              {instructors.map((instructor) => (
                <InstructorRow key={instructor.instructor_id} instructor={instructor} onStopped={removeInstructor} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
