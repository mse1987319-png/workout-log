import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUser } from '../offline/currentUser'
import { saveData } from '../offline/savedData'
import { backend } from '../test/fakeBackend'
import { ATHLETE } from '../test/fakeSupabase'
import AthletesPage from './AthletesPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const SAVED_AT = Date.parse('2026-11-16T16:42:00Z')

const INSTRUCTOR = { role: 'instructor', invite_code: 'K7P2QX' }
const ANNA = {
  athlete_id: 'a-1',
  email: 'anna@example.com',
  linked_at: '2026-11-01T09:00:00+00:00',
  last_workout_at: '2026-11-11T18:00:00+00:00',
  workouts_last_7_days: 3,
  last_report_at: '2026-11-12T08:00:00+00:00',
}
const BEN = {
  athlete_id: 'a-2',
  email: 'ben@example.com',
  linked_at: '2026-11-05T09:00:00+00:00',
  last_workout_at: null,
  workouts_last_7_days: 0,
  last_report_at: null,
}

function replyWith(profile, athletes) {
  backend.reply('GET', '/rest/v1/profiles', 200, [profile])
  backend.reply('POST', '/rest/v1/rpc/my_athletes', 200, athletes)
}

function renderAthletes() {
  render(
    <MemoryRouter>
      <AthletesPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('AthletesPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the Loading state while the athletes load', () => {
    backend.hang('GET', '/rest/v1/profiles')
    backend.hang('POST', '/rest/v1/rpc/my_athletes')
    renderAthletes()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your athletes…')
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('POST', '/rest/v1/rpc/my_athletes')
    replyWith(INSTRUCTOR, [ANNA])
    const user = renderAthletes()

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('link', { name: 'anna@example.com' })).toBeInTheDocument()
  })

  it('shows the code athletes type to share with me', async () => {
    replyWith(INSTRUCTOR, [ANNA])
    renderAthletes()

    const card = within(await screen.findByRole('region', { name: 'Your code' }))
    expect(card.getByText('K7P2QX')).toBeInTheDocument()
  })

  it('says who to give the code to when no athlete shares yet', async () => {
    replyWith(INSTRUCTOR, [])
    renderAthletes()

    expect(await screen.findByText('No athletes yet. Give them your code: K7P2QX.')).toBeInTheDocument()
  })

  it('lists each athlete with their latest activity and a link to their page', async () => {
    replyWith(INSTRUCTOR, [ANNA, BEN])
    renderAthletes()

    expect(await screen.findByRole('link', { name: 'anna@example.com' })).toHaveAttribute('href', '/athletes/a-1')
    const [anna, ben] = within(screen.getByRole('list', { name: 'Athletes who share with you' })).getAllByRole(
      'listitem',
    )
    expect(anna).toHaveTextContent('3 workouts in the last 7 days')
    expect(anna).toHaveTextContent(/Last workout: .+ · Last report: .+/)
    expect(ben).toHaveTextContent('No workouts in the last 7 days')
    expect(ben).toHaveTextContent('No workouts yet · No report yet')
  })

  it('explains that an athlete account has no code', async () => {
    replyWith({ role: 'athlete', invite_code: null }, [])
    renderAthletes()

    expect(
      await screen.findByText('Only instructor accounts have a code: this account signed up as an athlete.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No athletes yet.')).toBeInTheDocument()
  })

  it('shows the saved athletes offline, with when they were saved', async () => {
    setCurrentUser(ATHLETE.id)
    saveData('athletes', { profile: INSTRUCTOR, athletes: [ANNA] }, SAVED_AT)
    backend.networkDown('GET', '/rest/v1/profiles')
    backend.networkDown('POST', '/rest/v1/rpc/my_athletes')
    renderAthletes()

    expect(await screen.findByRole('link', { name: 'anna@example.com' })).toBeInTheDocument()
    expect(screen.getByText('K7P2QX')).toBeInTheDocument()
    expect(screen.getByText(/Offline: showing data saved on/)).toBeInTheDocument()
  })
})
