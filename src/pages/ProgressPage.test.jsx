import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import ProgressPage from './ProgressPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

const WORKOUTS = [
  { id: 'w1', type: 'strength', duration_min: 50, created_at: daysAgo(20) },
  { id: 'w2', type: 'strength', duration_min: 55, created_at: daysAgo(10) },
  { id: 'w3', type: 'other', duration_min: 30, created_at: daysAgo(9) },
  { id: 'w4', type: 'strength', duration_min: 40, created_at: now.toISOString() },
]
const SETS = [
  { workout_id: 'w1', exercise: 'Squat', weight_kg: 95, created_at: daysAgo(20) },
  { workout_id: 'w1', exercise: 'Bench press', weight_kg: 60, created_at: daysAgo(20) },
  { workout_id: 'w2', exercise: 'Squat', weight_kg: 100, created_at: daysAgo(10) },
  { workout_id: 'w4', exercise: 'Squat', weight_kg: 110, created_at: now.toISOString() },
  { workout_id: 'w4', exercise: 'Pull-up', weight_kg: 0, created_at: now.toISOString() },
]

function renderProgress() {
  render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

function replyWith(workouts, sets) {
  backend.reply('GET', '/rest/v1/workouts', 200, workouts)
  backend.reply('GET', '/rest/v1/workout_sets', 200, sets)
}

describe('ProgressPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the Loading state while the data loads', () => {
    backend.hang('GET', '/rest/v1/workouts')
    backend.hang('GET', '/rest/v1/workout_sets')
    renderProgress()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your progress…')
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('GET', '/rest/v1/workouts')
    backend.reply('GET', '/rest/v1/workouts', 200, WORKOUTS)
    backend.reply('GET', '/rest/v1/workout_sets', 200, SETS)
    const user = renderProgress()

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Heaviest set per session' })).toBeInTheDocument()
  })

  it('shows the Empty state with a way to log the first workout', async () => {
    replyWith([], [])
    renderProgress()

    expect(await screen.findByText('No workouts yet — log one to see your progress.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log a workout' })).toHaveAttribute('href', '/log')
  })

  it('charts the heaviest set per session of the most-trained exercise, and switches exercise', async () => {
    replyWith(WORKOUTS, SETS)
    const user = renderProgress()

    const picker = await screen.findByLabelText('Exercise')
    expect([...picker.options].map((option) => option.value)).toEqual(['Squat', 'Bench press'])
    expect(screen.getByText('Squat: 95 kg → 110 kg over 3 sessions (+15 kg).')).toBeInTheDocument()

    await user.selectOptions(picker, 'Bench press')
    expect(screen.getByText('Bench press: 60 kg in 1 session.')).toBeInTheDocument()
  })

  it('offers the numbers of both charts as tables', async () => {
    replyWith(WORKOUTS, SETS)
    renderProgress()

    const weights = within(await screen.findByRole('table', { name: 'Heaviest set per session: Squat' }))
    const weightRows = weights.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent)
    expect(weightRows).toEqual(['95 kg', '100 kg', '110 kg'])

    const minutes = within(screen.getByRole('table', { name: 'Minutes per week' }))
    const minuteRows = minutes.getAllByRole('row').slice(1)
    expect(minuteRows).toHaveLength(8)
    expect([...minuteRows.at(-1).cells].slice(1).map((cell) => cell.textContent)).toEqual(['40', '0', '40'])
  })

  it('summarizes this week', async () => {
    replyWith(WORKOUTS, SETS)
    renderProgress()

    expect(await screen.findByText('This week: 40 min (40 strength, 0 other).')).toBeInTheDocument()
  })

  it('explains the weight chart when no sets with weight are logged yet', async () => {
    replyWith(WORKOUTS, [SETS[4]])
    renderProgress()

    expect(
      await screen.findByText('Log a strength workout with weights to see how your lifts change.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Exercise')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Minutes per week' })).toBeInTheDocument()
  })
})
