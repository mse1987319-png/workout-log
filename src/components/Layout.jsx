import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { friendlyError } from '../lib/errors'
import Logo from './Logo'
import { ErrorState } from './States'

// Frame for the signed-in screens: logo, navigation, and the account
// (name and logout) at the far right.
export default function Layout() {
  const { user, role, signOut } = useAuth()
  const [logoutError, setLogoutError] = useState('')

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
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              My plans
            </NavLink>
            {role === 'instructor' && <NavLink to="/athletes">My athletes</NavLink>}
            <NavLink to="/progress">Progress</NavLink>
            {role === 'athlete' && <NavLink to="/sharing">Sharing</NavLink>}
          </nav>
          <div className="account">
            <span className="account-email">{user?.email}</span>
            <button type="button" className="button button-secondary" onClick={handleLogout}>
              Log out
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
