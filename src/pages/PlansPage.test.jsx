import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { backend } from '../test/fakeBackend'
import { ATHLETE } from '../test/fakeSupabase'
import PlansPage from './PlansPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const PLANS = [
  {
    id: 'plan-1',
    user_id: ATHLETE.id,
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
    user_id: ATHLETE.id,
    name: '5K plan',
    goal: null,
    created_at: '2026-11-01T08:00:00+00:00',
    workouts: [],
  },
]

function renderPlans() {
  render(
    <AuthContext.Provider value={{ user: ATHLETE, role: 'athlete' }}>
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>
    </AuthContext.Provider>,
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

  it('marks a plan an instructor assigned to me', async () => {
    const assigned = { id: 'plan-3', user_id: 'instructor-1', name: 'Coach plan', goal: null, created_at: '2026-11-11T08:00:00+00:00', workouts: [] }
    backend.reply('GET', '/rest/v1/plans', 200, [assigned, ...PLANS])
    renderPlans()

    expect((await planCard('Coach plan')).getByText('Assigned by your instructor')).toBeInTheDocument()
    expect((await planCard('Strength block')).queryByText('Assigned by your instructor')).not.toBeInTheDocument()
  })

  it("opens a workout's own page from the list", async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    renderPlans()

    expect(await screen.findByRole('link', { name: 'Leg day' })).toHaveAttribute('href', '/workouts/workout-2')
  })

  it('shows the Empty state with a way to create the first plan', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, [])
    renderPlans()

    expect(await screen.findByText('No plans yet — create your first plan.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first plan' })).toHaveAttribute('href', '/plans/new')
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

  it('has a New plan button that opens the plan creation page, and no Log workout button', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, PLANS)
    renderPlans()

    await screen.findByRole('heading', { name: 'Strength block' })
    expect(screen.getByRole('link', { name: 'New plan' })).toHaveAttribute('href', '/plans/new')
    expect(screen.queryByRole('link', { name: 'Log workout' })).not.toBeInTheDocument()
  })

  describe('editing and deleting a plan', () => {
    const planCard = async (name) => within((await screen.findByRole('heading', { name })).closest('li'))
    const UPDATED = { ...PLANS[0], name: 'Heavy block', goal: 'Squat 120 kg' }

    it('offers Edit and Delete on my own plans only', async () => {
      const assigned = {
        id: 'plan-3',
        user_id: 'instructor-1',
        name: 'Coach plan',
        goal: null,
        created_at: '2026-11-11T08:00:00+00:00',
        workouts: [],
      }
      backend.reply('GET', '/rest/v1/plans', 200, [assigned, ...PLANS])
      renderPlans()

      const mine = await planCard('Strength block')
      expect(mine.getByRole('button', { name: 'Edit plan Strength block' })).toBeInTheDocument()
      expect(mine.getByRole('button', { name: 'Delete plan Strength block' })).toBeInTheDocument()
      const coach = await planCard('Coach plan')
      expect(coach.queryByRole('button', { name: /^(Edit|Delete) plan/ })).not.toBeInTheDocument()
      expect(coach.getByRole('link', { name: 'Log workout under Coach plan' })).toBeInTheDocument()
    })

    it('edits the name and goal', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.reply('PATCH', '/rest/v1/plans', 200, UPDATED)
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Edit plan Strength block' }))
      expect(card.getByLabelText('Plan name')).toHaveValue('Strength block')
      expect(card.getByLabelText('Goal (optional)')).toHaveValue('Squat 100 kg')
      await user.clear(card.getByLabelText('Plan name'))
      await user.type(card.getByLabelText('Plan name'), '  Heavy block ')
      await user.clear(card.getByLabelText('Goal (optional)'))
      await user.type(card.getByLabelText('Goal (optional)'), 'Squat 120 kg')
      await user.click(card.getByRole('button', { name: 'Save plan' }))

      expect(await screen.findByRole('heading', { name: 'Heavy block' })).toBeInTheDocument()
      expect(screen.getByText('Goal: Squat 120 kg')).toBeInTheDocument()
      expect(screen.getByText('Plan updated.')).toBeInTheDocument()
      const patch = backend.requests.find((request) => request.method === 'PATCH')
      expect(patch.query.get('id')).toBe('eq.plan-1')
      expect(patch.body).toEqual({ name: 'Heavy block', goal: 'Squat 120 kg' })
      // The workouts under the plan are still there.
      expect(screen.getByRole('link', { name: 'Leg day' })).toBeInTheDocument()
    })

    it('cancels an edit without saving', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Edit plan Strength block' }))
      await user.type(card.getByLabelText('Plan name'), ' changed')
      await user.click(card.getByRole('button', { name: 'Cancel' }))

      expect(await screen.findByRole('heading', { name: 'Strength block' })).toBeInTheDocument()
      expect(backend.requests.filter((request) => request.method === 'PATCH')).toHaveLength(0)
    })

    it('needs a plan name when editing', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Edit plan Strength block' }))
      await user.clear(card.getByLabelText('Plan name'))
      await user.click(card.getByRole('button', { name: 'Save plan' }))

      expect(card.getByRole('alert')).toHaveTextContent('Enter a plan name.')
      expect(backend.requests.filter((request) => request.method === 'PATCH')).toHaveLength(0)
    })

    it('explains a failed edit and tries again', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.networkDown('PATCH', '/rest/v1/plans')
      backend.reply('PATCH', '/rest/v1/plans', 200, UPDATED)
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Edit plan Strength block' }))
      await user.click(card.getByRole('button', { name: 'Save plan' }))
      expect(await card.findByRole('alert')).toHaveTextContent("Can't reach the server")

      await user.click(card.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('heading', { name: 'Heavy block' })).toBeInTheDocument()
    })

    it('asks before deleting and says what goes with the plan', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Delete plan Strength block' }))

      expect(
        card.getByText('Delete “Strength block” and its 2 workouts, with their sets? This can’t be undone.'),
      ).toBeInTheDocument()
      await user.click(card.getByRole('button', { name: 'Cancel' }))
      expect(card.queryByText(/This can’t be undone/)).not.toBeInTheDocument()
      expect(backend.requests.filter((request) => request.method === 'DELETE')).toHaveLength(0)

      const empty = await planCard('5K plan')
      await user.click(empty.getByRole('button', { name: 'Delete plan 5K plan' }))
      expect(empty.getByText('Delete “5K plan”? This can’t be undone.')).toBeInTheDocument()
    })

    it('deletes the plan once confirmed', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.reply('DELETE', '/rest/v1/plans', 200, [{ id: 'plan-1' }])
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Delete plan Strength block' }))
      await user.click(card.getByRole('button', { name: 'Yes, delete plan' }))

      await waitFor(() => expect(screen.queryByRole('heading', { name: 'Strength block' })).not.toBeInTheDocument())
      expect(screen.getByRole('heading', { name: '5K plan' })).toBeInTheDocument()
      expect(screen.getByText('Plan deleted.')).toBeInTheDocument()
      expect(backend.requests.find((request) => request.method === 'DELETE').query.get('id')).toBe('eq.plan-1')
    })

    it('shows Deleting… while the plan is deleted', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.hang('DELETE', '/rest/v1/plans')
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Delete plan Strength block' }))
      await user.click(card.getByRole('button', { name: 'Yes, delete plan' }))

      expect(card.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    })

    it('keeps the plan and says why when the database refuses', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.reply('DELETE', '/rest/v1/plans', 409, {
        code: '23503',
        message: "Athletes have logged workouts under this plan, so it can't be deleted.",
        details: null,
        hint: null,
      })
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Delete plan Strength block' }))
      await user.click(card.getByRole('button', { name: 'Yes, delete plan' }))

      expect(await card.findByRole('alert')).toHaveTextContent(
        "Athletes have logged workouts under this plan, so it can't be deleted.",
      )
      expect(card.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Strength block' })).toBeInTheDocument()
    })

    it('explains a failed delete and tries again', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.networkDown('DELETE', '/rest/v1/plans')
      backend.reply('DELETE', '/rest/v1/plans', 200, [{ id: 'plan-1' }])
      const user = renderPlans()

      const card = await planCard('Strength block')
      await user.click(card.getByRole('button', { name: 'Delete plan Strength block' }))
      await user.click(card.getByRole('button', { name: 'Yes, delete plan' }))
      expect(await card.findByRole('alert')).toHaveTextContent("Can't reach the server")

      await user.click(card.getByRole('button', { name: 'Try again' }))
      await waitFor(() => expect(screen.queryByRole('heading', { name: 'Strength block' })).not.toBeInTheDocument())
    })
  })
})
