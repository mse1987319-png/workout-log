import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUser } from '../offline/currentUser'
import { saveData } from '../offline/savedData'
import { backend } from '../test/fakeBackend'
import { ATHLETE } from '../test/fakeSupabase'
import SharingPage from './SharingPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const SAVED_AT = Date.parse('2026-11-16T16:42:00Z')

const COACH = { instructor_id: 'i-1', email: 'coach@example.com', linked_at: '2026-11-10T09:00:00+00:00' }
const PHYSIO = { instructor_id: 'i-2', email: 'physio@example.com', linked_at: '2026-11-12T09:00:00+00:00' }
const LIST = '/rest/v1/rpc/my_instructors'
const LINK = '/rest/v1/rpc/link_instructor'

function renderSharing() {
  render(
    <MemoryRouter>
      <SharingPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const sharedWith = async () => within(await screen.findByRole('list', { name: 'Who you share with' }))

async function share(user, code) {
  await user.type(await screen.findByLabelText("Instructor's code"), code)
  await user.click(screen.getByRole('button', { name: 'Share' }))
}

describe('SharingPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the Loading state while the list loads', () => {
    backend.hang('POST', LIST)
    renderSharing()

    expect(screen.getByRole('status')).toHaveTextContent('Loading who you share with…')
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('POST', LIST)
    backend.reply('POST', LIST, 200, [COACH])
    const user = renderSharing()

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect((await sharedWith()).getByText('coach@example.com')).toBeInTheDocument()
  })

  it('says when you share with nobody yet', async () => {
    backend.reply('POST', LIST, 200, [])
    renderSharing()

    expect(await screen.findByText("You don't share with an instructor yet.")).toBeInTheDocument()
  })

  it('lists the instructors you share with, and since when', async () => {
    backend.reply('POST', LIST, 200, [COACH])
    renderSharing()

    const [item] = (await sharedWith()).getAllByRole('listitem')
    expect(item).toHaveTextContent('coach@example.com')
    expect(item).toHaveTextContent(/Sharing since .+/)
  })

  it('shares with the instructor who has the code', async () => {
    backend.reply('POST', LIST, 200, [COACH])
    backend.reply('POST', LINK, 200, PHYSIO)
    const user = renderSharing()

    await share(user, 'k7p2qx')

    expect(await screen.findByText('You now share with physio@example.com.')).toBeInTheDocument()
    expect(backend.requests.find((r) => r.path === LINK).body).toEqual({ p_code: 'k7p2qx' })
    expect((await sharedWith()).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByLabelText("Instructor's code")).toHaveValue('')
  })

  it('asks for a code before sending anything', async () => {
    backend.reply('POST', LIST, 200, [])
    const user = renderSharing()

    await user.click(await screen.findByRole('button', { name: 'Share' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter the code your instructor gave you.')
    expect(backend.requests.filter((r) => r.path === LINK)).toHaveLength(0)
  })

  it('explains a code that matches no instructor', async () => {
    backend.reply('POST', LIST, 200, [])
    backend.reply('POST', LINK, 400, {
      code: 'P0002',
      message: 'No instructor has that code. Check it and try again.',
      details: null,
      hint: null,
    })
    const user = renderSharing()

    await share(user, 'AAAAAA')

    expect(await screen.findByRole('alert')).toHaveTextContent('No instructor has that code. Check it and try again.')
  })

  it('shows Sharing… while the code is checked', async () => {
    backend.reply('POST', LIST, 200, [])
    backend.hang('POST', LINK)
    const user = renderSharing()

    await share(user, 'K7P2QX')

    expect(screen.getByRole('button', { name: 'Sharing…' })).toBeDisabled()
  })

  it('stops sharing with an instructor', async () => {
    backend.reply('POST', LIST, 200, [COACH, PHYSIO])
    backend.noContent('DELETE', '/rest/v1/instructor_links')
    const user = renderSharing()

    await user.click(await screen.findByRole('button', { name: 'Stop sharing with coach@example.com' }))

    await waitFor(async () => expect((await sharedWith()).getAllByRole('listitem')).toHaveLength(1))
    expect(backend.requests.find((r) => r.method === 'DELETE').query.get('instructor_id')).toBe('eq.i-1')
  })

  it('says when stopping failed, and tries again', async () => {
    backend.reply('POST', LIST, 200, [COACH])
    backend.networkDown('DELETE', '/rest/v1/instructor_links')
    backend.noContent('DELETE', '/rest/v1/instructor_links')
    const user = renderSharing()

    await user.click(await screen.findByRole('button', { name: 'Stop sharing with coach@example.com' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText("You don't share with an instructor yet.")).toBeInTheDocument()
  })

  it('shows the saved instructors offline, with when they were saved', async () => {
    setCurrentUser(ATHLETE.id)
    saveData('instructors', [COACH], SAVED_AT)
    backend.networkDown('POST', LIST)
    renderSharing()

    expect(await screen.findByText('coach@example.com')).toBeInTheDocument()
    expect(screen.getByText(/Offline: showing data saved on/)).toBeInTheDocument()
  })
})
