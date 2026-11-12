import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'
import { Loading, SuccessMessage } from '../components/States'
import { friendlyError } from '../lib/errors'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6 // Supabase's default minimum

function validate(mode, email, password) {
  if (!EMAIL.test(email)) return 'Enter a valid email address.'
  if (!password) return 'Enter your password.'
  if (mode === 'signup' && password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`
  }
  return ''
}

export default function LoginPage() {
  const { status, session, signIn, signUp } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('athlete')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (session) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  if (status === 'loading') return <Loading>Checking your session…</Loading>

  const isSignup = mode === 'signup'

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup')
    setError('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const cleanEmail = email.trim()
    const problem = validate(mode, cleanEmail, password)
    setNotice('')
    setError(problem)
    if (problem) return

    setSubmitting(true)
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUp(cleanEmail, password, role)
        if (needsConfirmation) {
          setMode('login')
          setPassword('')
          setNotice(`Check your email (${cleanEmail}) and open the confirmation link, then log in.`)
        }
      } else {
        await signIn(cleanEmail, password)
      }
      // On success the session changes and this page redirects itself.
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  let submitLabel = isSignup ? 'Sign up' : 'Log in'
  if (submitting) submitLabel = isSignup ? 'Signing up…' : 'Logging in…'

  return (
    <main className="page page-narrow">
      <div className="login-intro">
        <p className="login-logo">
          <Logo large />
        </p>
        <p>
          <span aria-hidden="true">💪 </span>Log your strength and cardio workouts. Your instructor gets an email about
          every new one.
        </p>
      </div>

      <section className="card">
        <h1>{isSignup ? 'Create an account' : 'Log in'}</h1>
        {notice && <SuccessMessage>{notice}</SuccessMessage>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              aria-describedby={isSignup ? 'login-password-hint' : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isSignup && (
              <p className="hint" id="login-password-hint">
                At least {MIN_PASSWORD} characters.
              </p>
            )}
          </div>

          {isSignup && (
            <fieldset className="role-choice">
              <legend>I am signing up as</legend>
              {[
                ['athlete', 'Athlete', 'Log workouts and share them with an instructor.'],
                ['instructor', 'Instructor', 'See the athletes who share with you and assign them plans.'],
              ].map(([value, label, hint]) => (
                <div key={value} className="role-option">
                  <input
                    id={`role-${value}`}
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    aria-describedby={`role-${value}-hint`}
                    onChange={() => setRole(value)}
                  />
                  <label htmlFor={`role-${value}`}>{label}</label>
                  <p className="hint" id={`role-${value}-hint`}>
                    {hint}
                  </p>
                </div>
              ))}
            </fieldset>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button" disabled={submitting}>
            {submitLabel}
          </button>
        </form>

        <p className="switch-mode">
          {isSignup ? 'Already registered?' : 'New here?'}{' '}
          <button type="button" className="link-button" onClick={switchMode}>
            {isSignup ? 'I already have an account' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  )
}
