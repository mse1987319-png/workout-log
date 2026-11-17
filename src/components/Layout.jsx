import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { useOutbox } from '../offline/outbox'
import { useBackgroundSync } from '../offline/useBackgroundSync'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'
import { AthletesIcon, LogIcon, PlansIcon, ProgressIcon, SharingIcon } from './NavIcons'
import StatusBar from './StatusBar'
import { ErrorState } from './States'

// Frame for the signed-in screens: logo, language switcher, navigation, and
// the account (name and logout) at the far right. On phones the navigation is
// the tab bar at the bottom of the screen (index.css).
export default function Layout() {
  const { user, role, signOut } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  // Log out asks only about workouts that would be sent by themselves (waiting,
  // or on their way). One that couldn't be sent is never sent automatically:
  // it waits on My plans for Try again or Delete, after a log out too.
  const unsent = useOutbox().filter((item) => item.status === 'waiting' || item.status === 'sending').length
  const { t } = useLanguage()

  // Once none is left while the question is open (they were sent meanwhile),
  // it closes by itself.
  if (confirmingLogout && unsent === 0) setConfirmingLogout(false)

  useBackgroundSync({ userId: user?.id, role })

  async function handleLogout() {
    setLogoutError('')
    setConfirmingLogout(false)
    try {
      await signOut()
    } catch (error) {
      setLogoutError(friendlyError(error))
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <Logo />
          </Link>
          <LanguageSwitcher />
          <nav className="nav" aria-label={t('nav.main')}>
            <NavLink to="/" end>
              <PlansIcon />
              {t('nav.myPlans')}
            </NavLink>
            <NavLink to="/log" className="nav-phone-only">
              <LogIcon />
              {t('nav.log')}
            </NavLink>
            {role === 'instructor' && (
              <NavLink to="/athletes" className="nav-athletes">
                <AthletesIcon />
                {t('nav.myAthletes')}
              </NavLink>
            )}
            <NavLink to="/progress">
              <ProgressIcon />
              {t('nav.progress')}
            </NavLink>
            {role === 'athlete' && (
              <NavLink to="/sharing">
                <SharingIcon />
                {t('nav.sharing')}
              </NavLink>
            )}
          </nav>
          <div className="account">
            <span className="account-email">{user?.email}</span>
            <button
              type="button"
              className="button button-secondary"
              onClick={unsent > 0 ? () => setConfirmingLogout(true) : handleLogout}
            >
              {t('account.logOut')}
            </button>
          </div>
        </div>
        {confirmingLogout && (
          <div className="confirm-delete" role="group" aria-label={t('account.logOut')}>
            <p>{t('account.unsent', { count: unsent })}</p>
            <div className="form-actions">
              <button type="button" className="button button-danger-solid" onClick={handleLogout}>
                {t('account.logOut')}
              </button>
              <button type="button" className="button button-secondary" onClick={() => setConfirmingLogout(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </header>
      <StatusBar />

      <main className="page">
        {logoutError && <ErrorState message={logoutError} onRetry={handleLogout} />}
        <Outlet />
      </main>
    </div>
  )
}
