import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import PlansPage from './PlansPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const PLANS = [
  {
    id: 'plan-1',
    name: 'Strength block',
    goal: 'Squat 100 kg',
    created_at: '2026-11-10T08:00:00+00:00',
    workouts: [
      {
        id: 'workout-2',
        title: 'Leg day',
        type: 'strength',
        duration_min: 60,
        created_at: '2026-11-10T18:00:00+00:00',
      },
      {
        id: 'workout-1',
        title: 'Easy run',
        type: 'other',
        duration_min: 30,
        created_at: '2026-11-09T07:00:00+00:00',
      },
    ],
  },
  {
    id: 'plan-2',
    name: '5K plan',
    goal: null,
    created_at: '2026-11-01T08:00:00+00:00',
    workouts: [],
  },
]

function renderPlans() {
  render(
    <MemoryRouter>
      <PlansPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function planCard(name) {
  return within((await screen.findByRole('heading', { name })).closest('li'))
}

async function startRenaming(user, title) {
  await user.click(await screen.findByRole('button', { name: `Edit title of ${title}` }))
  return screen.getByRole('textbox', { name: 'Workout title' })
}

describe('PlansPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the Loading state while the plans load', () => {
    backend.hang('GET', '/rest/v1/plans')
    renderPlans()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your plans…')
  })

  it('lists every plan with its goal and its workouts', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    renderPlans()

    const strength = await planCard('Strength block')
    expect(strength.getByText('Goal: Squat 100 kg')).toBeInTheDocument()
    const workouts = strength.getAllByRole('listitem')
    expect(workouts).toHaveLength(2)
    expect(workouts[0]).toHaveTextContent('Leg day')
    expect(workouts[0]).toHaveTextContent('Strength')
    expect(workouts[0]).toHaveTextContent('60 min')
    expect(workouts[1]).toHaveTextContent('Easy run')
    expect(workouts[1]).toHaveTextContent('Other')
    expect(workouts[1]).toHaveTextContent('30 min')

    const fiveK = await planCard('5K plan')
    expect(fiveK.getByText('No workouts logged under this plan yet.')).toBeInTheDocument()
    expect(fiveK.getByRole('link', { name: 'Log workout under 5K plan' })).toHaveAttribute(
      'href',
      '/log?plan=plan-2',
    )
  })

  it('shows the Empty state with a way to create the first plan', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, [])
    renderPlans()

    expect(await screen.findByText('No plans yet — create your first plan.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first plan' })).toHaveAttribute(
      'href',
      '/log',
    )
  })

  it('shows the Error state and loads again on Try again', async () => {
    backend.networkDown('GET', '/rest/v1/plans')
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    const user = renderPlans()

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Strength block' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renames a workout (deck test 5: an edit that must not send an email)', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    backend.reply('PATCH', '/rest/v1/workouts', 200, { id: 'workout-2', title: 'Heavy leg day' })
    const user = renderPlans()

    const input = await startRenaming(user, 'Leg day')
    expect(input).toHaveValue('Leg day')
    await user.clear(input)
    await user.type(input, '  Heavy leg day ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Heavy leg day')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Title updated.')
    const patch = backend.requests.find((request) => request.method === 'PATCH')
    expect(patch.query.get('id')).toBe('eq.workout-2')
    expect(patch.body).toEqual({ title: 'Heavy leg day' })
  })

  it('shows Saving… while the rename runs', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    backend.hang('PATCH', '/rest/v1/workouts')
    const user = renderPlans()

    const input = await startRenaming(user, 'Leg day')
    await user.type(input, ' 2')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('does not save an empty title', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    const user = renderPlans()

    const input = await startRenaming(user, 'Leg day')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a title.')
    expect(backend.requests.some((request) => request.method === 'PATCH')).toBe(false)
  })

  it('explains a failed rename, keeps the new text and retries', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    backend.networkDown('PATCH', '/rest/v1/workouts')
    backend.reply('PATCH', '/rest/v1/workouts', 200, { id: 'workout-2', title: 'Heavy leg day' })
    const user = renderPlans()

    const input = await startRenaming(user, 'Leg day')
    await user.clear(input)
    await user.type(input, 'Heavy leg day')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    expect(screen.getByRole('textbox', { name: 'Workout title' })).toHaveValue('Heavy leg day')

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Heavy leg day')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Workout title' })).not.toBeInTheDocument()
  })

  it('cancels a rename without saving', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    const user = renderPlans()

    const input = await startRenaming(user, 'Leg day')
    await user.type(input, ' (draft)')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Leg day')).toBeInTheDocument()
    expect(screen.queryByText('Leg day (draft)')).not.toBeInTheDocument()
    expect(backend.requests.some((request) => request.method === 'PATCH')).toBe(false)
  })
})
