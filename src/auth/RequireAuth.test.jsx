import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ATHLETE, sessionFor } from '../test/fakeSupabase'
import { AuthContext } from './AuthContext'
import RequireAuth from './RequireAuth'

function LoginStub() {
  const location = useLocation()
  return <p>login screen (from {location.state?.from?.pathname ?? 'nowhere'})</p>
}

function renderAt(path, { status, session }) {
  const auth = { status, session, user: session?.user ?? null }
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route
            path="/log"
            element={
              <RequireAuth>
                <p>protected page</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAuth', () => {
  it('waits for the session check instead of redirecting too early', () => {
    renderAt('/log', { status: 'loading', session: null })

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…')
    expect(screen.queryByText(/login screen/)).not.toBeInTheDocument()
    expect(screen.queryByText('protected page')).not.toBeInTheDocument()
  })

  it('sends a signed-out visitor to the login screen and remembers the page', () => {
    renderAt('/log', { status: 'ready', session: null })

    expect(screen.getByText('login screen (from /log)')).toBeInTheDocument()
    expect(screen.queryByText('protected page')).not.toBeInTheDocument()
  })

  it('shows the page to a signed-in user', () => {
    renderAt('/log', { status: 'ready', session: sessionFor(ATHLETE) })

    expect(screen.getByText('protected page')).toBeInTheDocument()
  })
})
