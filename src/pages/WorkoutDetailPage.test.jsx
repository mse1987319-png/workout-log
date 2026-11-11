import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import WorkoutDetailPage from './WorkoutDetailPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const STRENGTH = {
  id: 'w-1',
  title: 'Leg day',
  type: 'strength',
  duration_min: 60,
  activity: null,
  distance_km: null,
  notes: 'Felt strong',
  created_at: '2026-11-10T18:00:00+00:00',
  plan: { id: 'plan-1', name: 'Strength block' },
  workout_sets: [
    { exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100 },
    { exercise: 'Squat', set_no: 2, reps: 5, weight_kg: 102.5 },
    { exercise: 'Pull-up', set_no: 3, reps: 8, weight_kg: 0 },
  ],
}

const RUN = {
  id: 'w-2',
  title: 'Easy run',
  type: 'other',
  duration_min: 28,
  activity: 'run',
  distance_km: 5,
  notes: null,
  created_at: '2026-11-09T07:00:00+00:00',
  plan: { id: 'plan-2', name: '5K plan' },
  workout_sets: [],
}

function renderDetail(id = 'w-1') {
  render(
    <MemoryRouter initialEntries={[`/workouts/${id}`]}>
      <Routes>
        <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="/" element={<p>my plans page</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const exerciseSection = async (name) =>
  within((await screen.findByRole('heading', { name, level: 2 })).closest('section'))

describe('WorkoutDetailPage', () => {
  beforeEach(() => {
    backend.reset()
    backend.reply('GET', '/rest/v1/workout_sets', 200, [])
  })

  it('shows the Loading state while the workout loads', () => {
    backend.hang('GET', '/rest/v1/workouts')
    renderDetail()

    expect(screen.getByRole('status')).toHaveTextContent('Loading the workout…')
  })

  it('shows a strength workout with its sets grouped by exercise', async () => {
    backend.reply('GET', '/rest/v1/workouts', 200, STRENGTH)
    renderDetail('w-1')

    expect(await screen.findByRole('heading', { name: 'Leg day', level: 1 })).toBeInTheDocument()
    expect(backend.requests.find((r) => r.path === '/rest/v1/workouts').query.get('id')).toBe('eq.w-1')
    expect(screen.getByText('Strength block')).toBeInTheDocument()
    expect(screen.getByText('60 min')).toBeInTheDocument()
    expect(screen.getByText('Felt strong')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← My plans' })).toHaveAttribute('href', '/')

    const squat = await exerciseSection('Squat')
    const squatRows = squat.getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(squatRows).toEqual(['Set 15100 kg', 'Set 25102.5 kg'])
    const pullUp = await exerciseSection('Pull-up')
    expect(pullUp.getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual(['Set 18bodyweight'])
  })

  it('shows the previous session of each exercise, from before this workout', async () => {
    backend.reply('GET', '/rest/v1/workouts', 200, STRENGTH)
    backend.replyWhen(
      'GET',
      '/rest/v1/workout_sets',
      (request) => request.query.get('exercise') === 'ilike.Squat',
      200,
      [{ workout_id: 'w-0', set_no: 1, reps: 5, weight_kg: 95, created_at: '2026-11-03T18:00:00+00:00' }],
    )
    renderDetail('w-1')

    const squat = await exerciseSection('Squat')
    expect(await squat.findByText(/^Last time \(.+\): 5 @ 95 kg$/)).toBeInTheDocument()
    const pullUp = await exerciseSection('Pull-up')
    expect(await pullUp.findByText('First time logging Pull-up.')).toBeInTheDocument()

    const lookup = backend.requests.find((r) => r.query.get('exercise') === 'ilike.Squat')
    expect(lookup.query.get('created_at')).toBe('lt.2026-11-10T18:00:00+00:00')
  })

  it('shows distance and pace for a run, and no sets', async () => {
    backend.reply('GET', '/rest/v1/workouts', 200, RUN)
    renderDetail('w-2')

    expect(await screen.findByRole('heading', { name: 'Easy run', level: 1 })).toBeInTheDocument()
    const stats = within(screen.getByRole('list', { name: 'Workout details' }))
    expect(stats.getByText('Run')).toBeInTheDocument()
    expect(stats.getByText('5 km')).toBeInTheDocument()
    expect(stats.getByText('5:36 /km')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('says when a strength workout has no sets logged', async () => {
    backend.reply('GET', '/rest/v1/workouts', 200, { ...STRENGTH, workout_sets: [] })
    renderDetail('w-1')

    expect(await screen.findByText('No sets were logged for this workout.')).toBeInTheDocument()
  })

  it("shows a not-found message when the workout doesn't exist or isn't yours", async () => {
    backend.reply('GET', '/rest/v1/workouts', 406, {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'The result contains 0 rows',
      hint: null,
    })
    renderDetail('nope')

    expect(await screen.findByText("This workout doesn't exist, or it isn't yours.")).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← My plans' })).toHaveAttribute('href', '/')
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('GET', '/rest/v1/workouts')
    backend.reply('GET', '/rest/v1/workouts', 200, STRENGTH)
    const user = renderDetail('w-1')

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Leg day', level: 1 })).toBeInTheDocument()
  })
})
