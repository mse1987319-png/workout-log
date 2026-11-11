import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

// No mock here: the real src/lib/supabase.js runs with the blank
// Supabase settings from the test config (deck test 6, "bad env value").
describe('App without Supabase settings', () => {
  it('shows the Error state instead of a blank page', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('VITE_SUPABASE_URL')
    expect(alert).toHaveTextContent('VITE_SUPABASE_ANON_KEY')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
