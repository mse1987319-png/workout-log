import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { ATHLETE, authError, createFakeAuth, sessionFor } from '../test/fakeSupabase'
import LoginPage from './LoginPage'

vi.mock('../lib/supabase', () => ({ supabase: {}, configError: null }))

function renderLogin({ from } = {}) {
  const entry = { pathname: '/login', state: from ? { from: { pathname: from } } : null }
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>my plans page</p>} />
          <Route path="/log" element={<p>log workout page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return userEvent.setup()
}

async function fillIn(user, { email, password }) {
  if (email !== undefined) await user.type(await screen.findByLabelText('Email'), email)
  if (password !== undefined) await user.type(screen.getByLabelText('Password'), password)
}

async function openSignUp(user) {
  await user.click(await screen.findByRole('button', { name: 'Create an account' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    supabase.auth = createFakeAuth()
  })

  it('logs in and opens the plans', async () => {
    const user = renderLogin()
    await fillIn(user, { email: '  athlete@example.com ', password: 'secret1' })
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('my plans page')).toBeInTheDocument()
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'athlete@example.com',
      password: 'secret1',
    })
  })

  it('returns to the page the visitor first asked for', async () => {
    const user = renderLogin({ from: '/log' })
    await fillIn(user, { email: 'athlete@example.com', password: 'secret1' })
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('log workout page')).toBeInTheDocument()
  })

  it('shows a loading state while the login request runs', async () => {
    supabase.auth.signInWithPassword.mockReturnValueOnce(new Promise(() => {}))
    const user = renderLogin()
    await fillIn(user, { email: 'athlete@example.com', password: 'secret1' })
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled()
  })

  it('explains a failed login and keeps what was typed', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: authError('invalid_credentials', 400, 'Invalid login credentials'),
    })
    const user = renderLogin()
    await fillIn(user, { email: 'athlete@example.com', password: 'wrong-pass' })
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
    expect(screen.getByLabelText('Email')).toHaveValue('athlete@example.com')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
    expect(screen.queryByText('my plans page')).not.toBeInTheDocument()
  })

  it('does not call Supabase until a valid email and a password are entered', async () => {
    const user = renderLogin()
    await fillIn(user, { email: 'not-an-email' })
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.')

    await user.clear(screen.getByLabelText('Email'))
    await fillIn(user, { email: 'athlete@example.com' })
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your password.')

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs up and goes straight in when email confirmation is off', async () => {
    const user = renderLogin()
    await openSignUp(user)
    await fillIn(user, { email: 'new@example.com', password: 'secret1' })
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('my plans page')).toBeInTheDocument()
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
  })

  it('asks a new user to confirm their email when Supabase requires it', async () => {
    supabase.auth = createFakeAuth({ confirmEmail: true })
    const user = renderLogin()
    await openSignUp(user)
    await fillIn(user, { email: 'new@example.com', password: 'secret1' })
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Check your email (new@example.com) and open the confirmation link, then log in.',
    )
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByText('my plans page')).not.toBeInTheDocument()
  })

  it('requires a password of at least 6 characters to sign up', async () => {
    const user = renderLogin()
    await openSignUp(user)
    await fillIn(user, { email: 'new@example.com', password: '12345' })
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 6 characters.')
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('sends an already signed-in user on to the plans', async () => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    renderLogin()

    expect(await screen.findByText('my plans page')).toBeInTheDocument()
  })
})
