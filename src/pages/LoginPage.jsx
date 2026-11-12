import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import Logo from '../components/Logo'
import { Loading, SuccessMessage } from '../components/States'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6 // Supabase's default minimum

function validate(mode, email, password) {
  if (!EMAIL.test(email)) return t('login.invalidEmail')
  if (!password) return t('login.enterPassword')
  if (mode === 'signup' && password.length < MIN_PASSWORD) {
    return t('login.passwordTooShort', { min: MIN_PASSWORD })
  }
  return ''
}

export default function LoginPage() {
  const { status, session, signIn, signUp } = useAuth()
  const location = useLocation()
  useLanguage() // re-render when the language changes
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('athlete')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (session) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  if (status === 'loading') return <Loading>{t('common.checkingSession')}</Loading>

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
          setNotice(t('login.checkEmail', { email: cleanEmail }))
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

  let submitLabel = isSignup ? t('login.signUp') : t('login.logIn')
  if (submitting) submitLabel = isSignup ? t('login.signingUp') : t('login.loggingIn')

  return (
    <main className="page page-narrow">
      <div className="login-lang">
        <LanguageSwitcher />
      </div>
      <div className="login-intro">
        <p className="login-logo">
          <Logo large />
        </p>
        <p>
          <span aria-hidden="true">💪 </span>
          {t('login.intro')}
        </p>
      </div>

      <section className="card">
        <h1>{isSignup ? t('login.createAccount') : t('login.logIn')}</h1>
        {notice && <SuccessMessage>{notice}</SuccessMessage>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">{t('login.email')}</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t('login.password')}</label>
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
                {t('login.passwordHint', { min: MIN_PASSWORD })}
              </p>
            )}
          </div>

          {isSignup && (
            <fieldset className="role-choice">
              <legend>{t('login.roleLegend')}</legend>
              {[
                ['athlete', t('login.roleAthlete'), t('login.roleAthleteHint')],
                ['instructor', t('login.roleInstructor'), t('login.roleInstructorHint')],
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
          {isSignup ? t('login.alreadyRegistered') : t('login.newHere')}{' '}
          <button type="button" className="link-button" onClick={switchMode}>
            {isSignup ? t('login.haveAccount') : t('login.createAccount')}
          </button>
        </p>
      </section>
    </main>
  )
}
