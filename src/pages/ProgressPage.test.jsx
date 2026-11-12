import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCalendarDay } from '../lib/format'
import { toYmd } from '../lib/goals'
import { backend } from '../test/fakeBackend'
import ProgressPage from './ProgressPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()
const day = (offset) => toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))

const WORKOUTS = [
  { id: 'w1', type: 'strength', duration_min: 50, created_at: daysAgo(20) },
  { id: 'w2', type: 'strength', duration_min: 55, created_at: daysAgo(10) },
  { id: 'w3', type: 'other', duration_min: 30, created_at: daysAgo(9) },
  { id: 'w4', type: 'strength', duration_min: 40, created_at: now.toISOString() },
]
const SETS = [
  { workout_id: 'w1', exercise: 'Squat', reps: 5, weight_kg: 95, created_at: daysAgo(20) },
  { workout_id: 'w1', exercise: 'Bench press', reps: 8, weight_kg: 60, created_at: daysAgo(20) },
  { workout_id: 'w2', exercise: 'Squat', reps: 5, weight_kg: 100, created_at: daysAgo(10) },
  { workout_id: 'w4', exercise: 'Squat', reps: 5, weight_kg: 110, created_at: now.toISOString() },
  { workout_id: 'w4', exercise: 'Pull-up', reps: 8, weight_kg: 0, created_at: now.toISOString() },
]
const SQUAT_GOAL = { id: 'g1', exercise: 'Squat', target_kg: 120, target_date: day(49), created_at: daysAgo(5) }
const BENCH_GOAL = { id: 'g2', exercise: 'Bench press', target_kg: 90, target_date: day(30), created_at: now.toISOString() }
const goalLabel = (goal) => `${goal.exercise} ${goal.target_kg} kg by ${formatCalendarDay(goal.target_date)}`
const weightSection = () => screen.findByRole('region', { name: 'Heaviest set per session' })

function renderProgress() {
  render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

function replyWith(workouts, sets, goals = []) {
  backend.reply('GET', '/rest/v1/workouts', 200, workouts)
  backend.reply('GET', '/rest/v1/workout_sets', 200, sets)
  backend.reply('GET', '/rest/v1/goals', 200, goals)
}

describe('ProgressPage', () => {
  beforeEach(() => {
    backend.reset()
    // The report card (tested on its own) loads alongside the charts.
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, { days: 7, workouts: 1, summary: 'Report preview.' })
    backend.reply('GET', '/rest/v1/reports', 200, [])
  })

  it('shows the Loading state while the data loads', () => {
    backend.hang('GET', '/rest/v1/workouts')
    backend.hang('GET', '/rest/v1/workout_sets')
    backend.hang('GET', '/rest/v1/goals')
    renderProgress()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your progress…')
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('GET', '/rest/v1/workouts')
    replyWith(WORKOUTS, SETS)
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

    const picker = within(await weightSection()).getByLabelText('Exercise')
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
    expect(within(await weightSection()).queryByLabelText('Exercise')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Minutes per week' })).toBeInTheDocument()
  })

  it('puts suggestions and goals first, then the report and the charts', async () => {
    replyWith(WORKOUTS, SETS)
    renderProgress()

    await screen.findByRole('heading', { name: 'Suggestions' })
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Suggestions',
      'Goals',
      'Report to your instructor',
      'Heaviest set per session',
      'Minutes per week',
    ])
  })

  it('shows my goals with their bars', async () => {
    replyWith(WORKOUTS, SETS, [SQUAT_GOAL])
    renderProgress()

    const bar = await screen.findByRole('progressbar', { name: goalLabel(SQUAT_GOAL) })
    expect(bar).toHaveAttribute('aria-valuetext', '110 of 120 kg')
  })

  it('adds a goal in date order and suggests the pace it needs', async () => {
    replyWith(WORKOUTS, SETS, [SQUAT_GOAL])
    backend.reply('POST', '/rest/v1/goals', 201, BENCH_GOAL)
    const user = renderProgress()

    const goals = within(await screen.findByRole('region', { name: 'Goals' }))
    await user.type(goals.getByLabelText('Exercise'), BENCH_GOAL.exercise)
    await user.type(goals.getByLabelText('Target (kg)'), '90')
    await user.type(goals.getByLabelText('Reach it by'), BENCH_GOAL.target_date)
    await user.click(goals.getByRole('button', { name: 'Add goal' }))

    expect(await goals.findByText(`Goal added: ${goalLabel(BENCH_GOAL)}.`)).toBeInTheDocument()
    expect(goals.getAllByRole('progressbar').map((bar) => bar.getAttribute('aria-label'))).toEqual([
      goalLabel(BENCH_GOAL),
      goalLabel(SQUAT_GOAL),
    ])
    const suggestions = within(screen.getByRole('list', { name: 'Suggestions' }))
    expect(
      suggestions.getByText(`Bench press 90 kg by ${formatCalendarDay(BENCH_GOAL.target_date)}: aim for +7 kg a week.`),
    ).toBeInTheDocument()
  })

  it('takes a removed goal off the list', async () => {
    replyWith(WORKOUTS, SETS, [SQUAT_GOAL, BENCH_GOAL])
    backend.noContent('DELETE', '/rest/v1/goals')
    const user = renderProgress()

    await user.click(await screen.findByRole('button', { name: `Remove goal: ${goalLabel(SQUAT_GOAL)}` }))

    await waitFor(() => expect(screen.getAllByRole('progressbar')).toHaveLength(1))
    expect(screen.getByRole('progressbar')).toHaveAccessibleName(goalLabel(BENCH_GOAL))
  })

  it('suggests picking up again after a week without workouts', async () => {
    replyWith(WORKOUTS.slice(0, 2), SETS.slice(0, 3))
    renderProgress()

    expect(await screen.findByText('Pick up where you left off.')).toBeInTheDocument()
    expect(screen.getByText(/^Your last workout was \d+ days ago \(.+\)\.$/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log a workout' })).toHaveAttribute('href', '/log')
  })
})
