import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'
import { ErrorState } from './States'

// Frame for the signed-in screens: logo, language switcher, navigation, and
// the account (name and logout) at the far right.
export default function Layout() {
  const { user, role, signOut } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const { t } = useLanguage()

  async function handleLogout() {
    setLogoutError('')
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
              {t('nav.myPlans')}
            </NavLink>
            {role === 'instructor' && <NavLink to="/athletes">{t('nav.myAthletes')}</NavLink>}
            <NavLink to="/progress">{t('nav.progress')}</NavLink>
            {role === 'athlete' && <NavLink to="/sharing">{t('nav.sharing')}</NavLink>}
          </nav>
          <div className="account">
            <span className="account-email">{user?.email}</span>
            <button type="button" className="button button-secondary" onClick={handleLogout}>
              {t('account.logOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {logoutError && <ErrorState message={logoutError} onRetry={handleLogout} />}
        <Outlet />
      </main>
    </div>
  )
}
