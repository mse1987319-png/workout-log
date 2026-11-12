import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCalendarDay } from '../lib/format'
import { toYmd } from '../lib/goals'
import { backend } from '../test/fakeBackend'
import AthletePage from './AthletePage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()
const day = (offset) => toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))

const PROGRESS = {
  athlete: { id: 'a-1', email: 'anna@example.com' },
  linked_at: daysAgo(10),
  workouts: [
    {
      id: 'w1',
      type: 'strength',
      title: 'Leg day',
      duration_min: 50,
      activity: null,
      distance_km: null,
      notes: null,
      sets_summary: 'Squat: 3 × 5 @ 100 kg',
      plan_name: '5 × 5',
      created_at: daysAgo(3),
    },
    {
      id: 'w2',
      type: 'other',
      title: 'Easy run',
      duration_min: 30,
      activity: 'run',
      distance_km: 5,
      notes: null,
      sets_summary: null,
      plan_name: 'Running',
      created_at: daysAgo(1),
    },
  ],
  sets: [1, 2, 3].map(() => ({ workout_id: 'w1', exercise: 'Squat', reps: 5, weight_kg: 100, created_at: daysAgo(3) })),
  goals: [{ id: 'g1', exercise: 'Squat', target_kg: 120, target_date: day(49), created_at: daysAgo(10) }],
  reports: [{ created_at: daysAgo(0), summary: 'Last 7 days: 2 workouts (1 strength, 1 other), 80 min, 3 sets.' }],
}
const PLANS = [
  { id: 'plan-1', name: '5 × 5' },
  { id: 'plan-2', name: 'Hypertrophy' },
]
const FIVE_BY_FIVE = { plan_id: 'plan-1', created_at: daysAgo(5), plan: { id: 'plan-1', name: '5 × 5' } }
const HYPERTROPHY = { plan_id: 'plan-2', created_at: daysAgo(0), plan: { id: 'plan-2', name: 'Hypertrophy' } }

function replyWith({ progress = PROGRESS, assignments = [FIVE_BY_FIVE], plans = PLANS } = {}) {
  backend.reply('POST', '/rest/v1/rpc/athlete_progress', 200, progress)
  backend.reply('GET', '/rest/v1/plan_assignments', 200, assignments)
  backend.reply('GET', '/rest/v1/plans', 200, plans)
}

function renderAthlete() {
  render(
    <MemoryRouter initialEntries={['/athletes/a-1']}>
      <Routes>
        <Route path="/athletes/:id" element={<AthletePage />} />
        <Route path="/athletes" element={<p>athletes list</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const card = async (name) => within(await screen.findByRole('region', { name }))

describe('AthletePage', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the Loading state while the athlete loads', () => {
    backend.hang('POST', '/rest/v1/rpc/athlete_progress')
    backend.hang('GET', '/rest/v1/plan_assignments')
    backend.hang('GET', '/rest/v1/plans')
    renderAthlete()

    expect(screen.getByRole('status')).toHaveTextContent('Loading the athlete…')
  })

  it("says so when the athlete isn't sharing with me, with a way back", async () => {
    backend.reply('POST', '/rest/v1/rpc/athlete_progress', 403, {
      code: '42501',
      message: 'This athlete is not sharing with you.',
      details: null,
      hint: null,
    })
    replyWith()
    renderAthlete()

    expect(await screen.findByRole('alert')).toHaveTextContent("This athlete isn't sharing with you.")
    expect(screen.getByRole('link', { name: 'Back to My athletes' })).toHaveAttribute('href', '/athletes')
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('POST', '/rest/v1/rpc/athlete_progress')
    replyWith()
    const user = renderAthlete()

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'anna@example.com' })).toBeInTheDocument()
  })

  it("shows the athlete's progress read-only", async () => {
    replyWith()
    renderAthlete()

    expect(await screen.findByRole('heading', { level: 1, name: 'anna@example.com' })).toBeInTheDocument()
    expect(screen.getByText(/^Sharing with you since .+\.$/)).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: `Squat 120 kg by ${formatCalendarDay(day(49))}` }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add goal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove goal/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suggestions for this athlete' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heaviest set per session' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Minutes per week' })).toBeInTheDocument()
  })

  it('lists recent workouts newest first, with their sets or distance', async () => {
    replyWith()
    renderAthlete()

    const [run, legs] = (await card('Recent workouts')).getAllByRole('listitem')
    expect(run).toHaveTextContent('Easy run')
    expect(run).toHaveTextContent('5 km')
    expect(legs).toHaveTextContent('Leg day')
    expect(legs).toHaveTextContent('Squat: 3 × 5 @ 100 kg')
    expect(legs).toHaveTextContent('5 × 5')
  })

  it('shows the latest reports', async () => {
    replyWith()
    renderAthlete()

    expect((await card('Reports')).getByText(PROGRESS.reports[0].summary)).toBeInTheDocument()
  })

  it('assigns one of my plans that is not assigned yet', async () => {
    replyWith()
    backend.reply('POST', '/rest/v1/plan_assignments', 201, HYPERTROPHY)
    const user = renderAthlete()

    const plans = await card('Plans you assigned')
    expect([...plans.getByLabelText('Plan').options].map((option) => option.textContent)).toEqual(['Hypertrophy'])
    await user.click(plans.getByRole('button', { name: 'Assign' }))

    expect(await plans.findByText('Assigned Hypertrophy: the athlete sees it under My plans.')).toBeInTheDocument()
    expect(backend.requests.find((r) => r.method === 'POST' && r.path === '/rest/v1/plan_assignments').body).toEqual({
      plan_id: 'plan-2',
      athlete_id: 'a-1',
    })
    expect(plans.getByRole('button', { name: 'Unassign Hypertrophy' })).toBeInTheDocument()
    expect(plans.getByText('All your plans are assigned to this athlete.')).toBeInTheDocument()
  })

  it('unassigns a plan', async () => {
    replyWith()
    backend.noContent('DELETE', '/rest/v1/plan_assignments')
    const user = renderAthlete()

    const plans = await card('Plans you assigned')
    await user.click(plans.getByRole('button', { name: 'Unassign 5 × 5' }))

    await waitFor(() => expect(plans.queryByRole('button', { name: 'Unassign 5 × 5' })).not.toBeInTheDocument())
    const request = backend.requests.find((r) => r.method === 'DELETE')
    expect(request.query.get('plan_id')).toBe('eq.plan-1')
    expect(request.query.get('athlete_id')).toBe('eq.a-1')
    expect([...plans.getByLabelText('Plan').options].map((option) => option.textContent)).toEqual([
      '5 × 5',
      'Hypertrophy',
    ])
  })

  it('says to create a plan first when I have none', async () => {
    replyWith({ assignments: [], plans: [] })
    renderAthlete()

    const plans = await card('Plans you assigned')
    expect(plans.getByText('No plans assigned yet.')).toBeInTheDocument()
    expect(plans.getByRole('link', { name: 'Create a plan' })).toHaveAttribute('href', '/plans/new')
  })
})
