import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { STORAGE_KEY, setLanguage } from '../i18n/i18n'
import { supabase } from '../lib/supabase'
import { backend } from '../test/fakeBackend'
import { ATHLETE, createFakeAuth, sessionFor } from '../test/fakeSupabase'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

function renderApp(path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('the language switcher', () => {
  beforeAll(async () => {
    await import('../pages/ProgressPage')
  }, 60000)

  beforeEach(() => {
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    backend.reset()
    backend.reply('GET', '/rest/v1/plans', 200, [])
  })

  it('sits in the header between the logo and the menu, as two radio buttons: LT and EN', async () => {
    renderApp('/')

    const switcher = (await screen.findByRole('group', { name: 'Language' })).closest('fieldset')
    const radios = within(switcher).getAllByRole('radio')
    expect(radios.map((radio) => radio.parentElement.textContent)).toEqual(['LT', 'EN'])

    const inner = switcher.parentElement
    const order = [...inner.children]
    expect(order.indexOf(inner.querySelector('.brand'))).toBeLessThan(order.indexOf(switcher))
    expect(order.indexOf(switcher)).toBeLessThan(order.indexOf(screen.getByRole('navigation', { name: 'Main' })))
  })

  it('translates the screen and checks the chosen radio', async () => {
    const user = renderApp('/')
    await screen.findByRole('heading', { name: 'My plans' })
    expect(screen.getByRole('radio', { name: 'EN' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'LT' }))

    expect(await screen.findByRole('heading', { name: 'Mano planai' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'LT' })).toBeChecked()
    expect(screen.getByRole('link', { name: 'Pažanga' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atsijungti' })).toBeInTheDocument()
    expect(screen.getByText('Planų dar nėra – sukurkite pirmąjį planą.')).toBeInTheDocument()
    expect(screen.queryByText('Log out')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('lt')
  })

  it('keeps the language while moving between screens, and switches back', async () => {
    setLanguage('lt')
    const user = renderApp('/')
    await screen.findByRole('heading', { name: 'Mano planai' })

    await user.click(screen.getByRole('link', { name: 'Dalijimasis' }))
    expect(await screen.findByRole('heading', { name: 'Dalijimasis' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Mano planai' }))
    expect(await screen.findByRole('heading', { name: 'Mano planai' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'LT' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'EN' }))
    expect(await screen.findByRole('heading', { name: 'My plans' })).toBeInTheDocument()
  })

  it('is on the login screen too, where there is no menu', async () => {
    supabase.auth = createFakeAuth()
    setLanguage('lt')
    const user = renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Prisijungti' })).toBeInTheDocument()
    expect(screen.getByLabelText('El. paštas')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'EN' }))
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})
