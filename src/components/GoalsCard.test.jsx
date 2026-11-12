import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCalendarDay } from '../lib/format'
import { toYmd } from '../lib/goals'
import { backend } from '../test/fakeBackend'
import GoalsCard from './GoalsCard'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const now = new Date()
const at = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12).toISOString()
const day = (offset) => toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))

const SETS = [
  { workout_id: 'w1', exercise: 'Squat', reps: 5, weight_kg: 100, created_at: at(-10) },
  { workout_id: 'w2', exercise: 'Squat', reps: 5, weight_kg: 110, created_at: at(-3) },
  { workout_id: 'w2', exercise: 'Bench press', reps: 5, weight_kg: 80, created_at: at(-3) },
]
const GOAL = { id: 'g1', exercise: 'Squat', target_kg: 120, target_date: day(49), created_at: at(-1) }
const SAVED = { id: 'g2', exercise: 'Bench press', target_kg: 90, target_date: day(30), created_at: at(0) }
const label = (goal, kg = goal.target_kg) => `${goal.exercise} ${kg} kg by ${formatCalendarDay(goal.target_date)}`

function renderCard({ goals = [GOAL], sets = SETS } = {}) {
  const onAdded = vi.fn()
  const onRemoved = vi.fn()
  render(<GoalsCard goals={goals} sets={sets} onAdded={onAdded} onRemoved={onRemoved} />)
  return { user: userEvent.setup(), onAdded, onRemoved }
}

async function fillIn(user, { exercise, kg, date }) {
  await user.type(screen.getByLabelText('Exercise'), exercise)
  await user.type(screen.getByLabelText('Target (kg)'), kg)
  await user.type(screen.getByLabelText('Reach it by'), date)
}

describe('GoalsCard', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows each goal with a bar of the heaviest set against the target', () => {
    renderCard()

    const bar = screen.getByRole('progressbar', { name: label(GOAL) })
    expect(bar).toHaveAttribute('aria-valuenow', '110')
    expect(bar).toHaveAttribute('aria-valuemax', '120')
    expect(bar).toHaveAttribute('aria-valuetext', '110 of 120 kg')
    expect(screen.getByText('110 / 120 kg')).toBeInTheDocument()
    expect(screen.getByText('10 kg to go, 49 days left.')).toBeInTheDocument()
  })

  it('marks a reached goal', () => {
    renderCard({ goals: [{ ...GOAL, target_kg: 105 }] })

    expect(screen.getByRole('progressbar', { name: label(GOAL, 105) })).toHaveAttribute('aria-valuenow', '105')
    expect(screen.getByText(/^Reached on .+\.$/)).toBeInTheDocument()
  })

  it('can show the goals read-only, for an instructor', () => {
    render(<GoalsCard goals={[GOAL]} sets={SETS} readOnly />)

    expect(screen.getByRole('progressbar', { name: label(GOAL) })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove goal/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add goal' })).not.toBeInTheDocument()
  })

  it('says there are no goals without offering the form when read-only', () => {
    render(<GoalsCard goals={[]} sets={SETS} readOnly />)

    expect(screen.getByText('No goals yet.')).toBeInTheDocument()
  })

  it('says when there are no goals yet', () => {
    renderCard({ goals: [] })

    expect(screen.getByText('No goals yet. Set one below: an exercise, a weight and a date.')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('suggests the exercises already lifted with weight', () => {
    renderCard()

    const list = document.getElementById(screen.getByLabelText('Exercise').getAttribute('list'))
    expect([...list.options].map((option) => option.value)).toEqual(['Squat', 'Bench press'])
  })

  it('adds a goal and confirms it', async () => {
    backend.reply('POST', '/rest/v1/goals', 201, SAVED)
    const { user, onAdded } = renderCard()

    await fillIn(user, { exercise: 'Bench press', kg: '90', date: SAVED.target_date })
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(await screen.findByText(`Goal added: ${label(SAVED)}.`)).toBeInTheDocument()
    expect(onAdded).toHaveBeenCalledWith(SAVED)
    expect(backend.requests.at(-1).body).toEqual({ exercise: 'Bench press', target_kg: 90, target_date: SAVED.target_date })
    expect(screen.getByLabelText('Exercise')).toHaveValue('')
  })

  it('explains what to fix before saving anything', async () => {
    const { user } = renderCard()

    await user.click(screen.getByRole('button', { name: 'Add goal' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the exercise.')

    await fillIn(user, { exercise: 'Squat', kg: '0', date: day(10) })
    await user.click(screen.getByRole('button', { name: 'Add goal' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the target weight in kg: more than 0, up to 1000.')
    expect(backend.requests).toHaveLength(0)
  })

  it('shows Adding… while the goal is saved', async () => {
    backend.hang('POST', '/rest/v1/goals')
    const { user } = renderCard()

    await fillIn(user, { exercise: 'Bench press', kg: '90', date: SAVED.target_date })
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled()
  })

  it('says what went wrong when saving fails, and tries again', async () => {
    backend.networkDown('POST', '/rest/v1/goals')
    backend.reply('POST', '/rest/v1/goals', 201, SAVED)
    const { user, onAdded } = renderCard()

    await fillIn(user, { exercise: 'Bench press', kg: '90', date: SAVED.target_date })
    await user.click(screen.getByRole('button', { name: 'Add goal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(`Goal added: ${label(SAVED)}.`)).toBeInTheDocument()
    expect(onAdded).toHaveBeenCalledTimes(1)
  })

  it('removes a goal', async () => {
    backend.noContent('DELETE', '/rest/v1/goals')
    const { user, onRemoved } = renderCard()

    await user.click(screen.getByRole('button', { name: `Remove goal: ${label(GOAL)}` }))

    await vi.waitFor(() => expect(onRemoved).toHaveBeenCalledWith('g1'))
    expect(backend.requests[0].query.get('id')).toBe('eq.g1')
  })

  it('says when a goal could not be removed, and tries again', async () => {
    backend.networkDown('DELETE', '/rest/v1/goals')
    backend.noContent('DELETE', '/rest/v1/goals')
    const { user, onRemoved } = renderCard()

    await user.click(screen.getByRole('button', { name: `Remove goal: ${label(GOAL)}` }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    expect(onRemoved).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await vi.waitFor(() => expect(onRemoved).toHaveBeenCalledWith('g1'))
  })
})
