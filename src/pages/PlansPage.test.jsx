import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { setCurrentUser } from '../offline/currentUser'
import { addToOutbox, getOutbox, updateItem } from '../offline/outbox'
import { readSaved, saveData } from '../offline/savedData'
import { syncOutbox } from '../offline/sync'
import { backend } from '../test/fakeBackend'
import { ATHLETE, createFakeAuth, sessionFor } from '../test/fakeSupabase'
import PlansPage from './PlansPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const SAVED_AT = Date.parse('2026-11-16T16:42:00Z')

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

// The next request reaches the backend now, but its reply waits for release().
function holdNextReply() {
  let release
  const released = new Promise((resolve) => {
    release = resolve
  })
  const answer = backend.fetch
  vi.spyOn(backend, 'fetch').mockImplementationOnce((input, init) => {
    const reply = answer(input, init)
    return released.then(() => reply)
  })
  return release
}

describe('PlansPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('shows the saved plans offline, with when they were saved', async () => {
    setCurrentUser(ATHLETE.id)
    saveData('plans', PLANS, SAVED_AT)
    backend.networkDown('GET', '/rest/v1/plans')
    renderPlans()

    expect(await screen.findByRole('heading', { name: 'Strength block' })).toBeInTheDocument()
    expect(screen.getByText(/Offline: showing data saved on/)).toBeInTheDocument()
  })

  describe('the plan list it keeps for the Log workout screen', () => {
    const OPTIONS = [
      { id: 'plan-1', name: 'Strength block' },
      { id: 'plan-2', name: '5K plan' },
    ]

    beforeEach(() => {
      setCurrentUser(ATHLETE.id)
    })

    it('is the plans it loaded, saved at the same time', async () => {
      // The warm-up's older list is replaced.
      saveData('planOptions', [{ id: 'plan-2', name: '5K plan' }], SAVED_AT)
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      renderPlans()
      await screen.findByRole('heading', { name: 'Strength block' })

      const { savedAt } = readSaved('plans')
      expect(savedAt).toBeGreaterThan(SAVED_AT)
      expect(readSaved('planOptions')).toEqual({ data: OPTIONS, savedAt })
    })

    it('follows a renamed and a deleted plan', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.reply('PATCH', '/rest/v1/plans', 200, { ...PLANS[0], name: 'Heavy block' })
      backend.reply('DELETE', '/rest/v1/plans', 200, [{ id: 'plan-2' }])
      const user = renderPlans()

      const strength = await planCard('Strength block')
      await user.click(strength.getByRole('button', { name: 'Edit plan Strength block' }))
      await user.clear(strength.getByLabelText('Plan name'))
      await user.type(strength.getByLabelText('Plan name'), 'Heavy block')
      await user.click(strength.getByRole('button', { name: 'Save plan' }))
      await screen.findByRole('heading', { name: 'Heavy block' })
      expect(readSaved('planOptions').data).toEqual([{ id: 'plan-1', name: 'Heavy block' }, OPTIONS[1]])

      const fiveK = await planCard('5K plan')
      await user.click(fiveK.getByRole('button', { name: 'Delete plan 5K plan' }))
      await user.click(fiveK.getByRole('button', { name: 'Yes, delete plan' }))
      await waitFor(() => expect(screen.queryByRole('heading', { name: '5K plan' })).not.toBeInTheDocument())

      expect(readSaved('planOptions')).toEqual({ data: [{ id: 'plan-1', name: 'Heavy block' }], savedAt: readSaved('plans').savedAt })
    })
  })

  describe('workouts waiting to send', () => {
    const LOG_WORKOUT = '/rest/v1/rpc/log_workout'
    const WAITING = {
      planId: 'plan-1',
      title: 'Evening ride',
      type: 'other',
      durationMin: 45,
      activity: 'Cycling',
      distanceKm: 20,
      notes: null,
      sets: [],
    }
    const SENT_ROW = {
      id: 'b2c4e6a8-1d3f-4a5b-8c7d-9e0f1a2b3c4d',
      plan_id: 'plan-1',
      user_id: ATHLETE.id,
      title: 'Evening ride',
      type: 'other',
      duration_min: 45,
      created_at: '2026-11-16T18:00:00+00:00',
    }
    const PLAN_GONE = {
      code: '23503',
      message: 'insert or update on table "workouts" violates foreign key constraint',
      details: null,
      hint: null,
    }

    beforeEach(() => {
      supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
      setCurrentUser(ATHLETE.id)
    })

    const wait = (workout = {}, planName = 'Strength block') =>
      addToOutbox({ workout: { ...WAITING, ...workout }, planName })
    const posts = () => backend.requests.filter((request) => request.method === 'POST' && request.path === LOG_WORKOUT)
    const planLoads = () =>
      backend.requests.filter((request) => request.method === 'GET' && request.path === '/rest/v1/plans')

    it('lists a waiting workout under its plan with a Waiting to send badge, not as a link', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      wait()
      renderPlans()

      const strength = await planCard('Strength block')
      const rows = strength.getAllByRole('listitem')
      expect(rows).toHaveLength(3)
      expect(rows[0]).toHaveTextContent('Evening ride')
      expect(rows[0]).toHaveTextContent('Waiting to send')
      expect(rows[0]).toHaveTextContent('45 min')
      expect(rows[1]).toHaveTextContent('Leg day')
      expect(strength.queryByRole('link', { name: 'Evening ride' })).not.toBeInTheDocument()
      expect(strength.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
      expect(screen.queryByText('Workouts waiting to send')).not.toBeInTheDocument()
    })

    it('hides "No workouts yet" while a workout waits under a plan with none saved', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      wait({ planId: 'plan-2' }, '5K plan')
      renderPlans()

      const fiveK = await planCard('5K plan')
      expect(fiveK.getByText('Evening ride')).toBeInTheDocument()
      expect(fiveK.queryByText('No workouts logged under this plan yet.')).not.toBeInTheDocument()
    })

    it('shows a waiting workout whose plan is gone in its own card', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      wait({ planId: 'plan-gone' }, 'Old plan')
      renderPlans()

      const heading = await screen.findByRole('heading', { name: 'Workouts waiting to send' })
      const card = within(heading.closest('section'))
      expect(card.getByText('Evening ride')).toBeInTheDocument()
      expect(card.getByText('Waiting to send')).toBeInTheDocument()
      // The plans are listed as before, and the workout is in no plan's card.
      expect((await planCard('Strength block')).queryByText('Evening ride')).not.toBeInTheDocument()
    })

    it('shows every waiting workout in that card when the plans cannot be loaded', async () => {
      backend.networkDown('GET', '/rest/v1/plans')
      wait()
      renderPlans()

      expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
      const heading = screen.getByRole('heading', { name: 'Workouts waiting to send' })
      expect(within(heading.closest('section')).getByText('Evening ride')).toBeInTheDocument()
    })

    it('shows nothing extra while the plans load', () => {
      backend.hang('GET', '/rest/v1/plans')
      wait()
      renderPlans()

      expect(screen.queryByText('Evening ride')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Workouts waiting to send' })).not.toBeInTheDocument()
    })

    it("shows why a workout couldn't be sent, with Try again and Delete", async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      const item = wait()
      updateItem(item.id, { status: 'failed', error: { code: PLAN_GONE.code, message: PLAN_GONE.message } })
      const user = renderPlans()

      const strength = await planCard('Strength block')
      const row = within(strength.getByText('Evening ride').closest('li'))
      expect(row.getByText("Couldn't send")).toBeInTheDocument()
      expect(row.getByText(`Couldn't send: ${PLAN_GONE.message}`)).toBeInTheDocument()

      // Try again sends it once more.
      backend.reply('POST', LOG_WORKOUT, 200, SENT_ROW)
      await user.click(row.getByRole('button', { name: 'Try again' }))
      expect(await strength.findByRole('link', { name: 'Evening ride' })).toBeInTheDocument()
      expect(posts()).toHaveLength(1)
      expect(getOutbox()).toHaveLength(0)
    })

    it('deletes a workout that could not be sent once confirmed', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      const item = wait()
      updateItem(item.id, { status: 'failed', error: { code: PLAN_GONE.code, message: PLAN_GONE.message } })
      const user = renderPlans()

      const strength = await planCard('Strength block')
      const row = within(strength.getByText('Evening ride').closest('li'))
      await user.click(row.getByRole('button', { name: 'Delete' }))
      expect(row.getByText('Delete “Evening ride”? It was never sent, so it will be gone.')).toBeInTheDocument()

      await user.click(row.getByRole('button', { name: 'Cancel' }))
      expect(row.queryByText(/It was never sent/)).not.toBeInTheDocument()
      expect(getOutbox()).toHaveLength(1)

      await user.click(row.getByRole('button', { name: 'Delete' }))
      await user.click(row.getByRole('button', { name: 'Delete' }))
      await waitFor(() => expect(strength.queryByText('Evening ride')).not.toBeInTheDocument())
      expect(getOutbox()).toHaveLength(0)
      expect(posts()).toHaveLength(0)
    })

    it('turns a sent workout into a normal row', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.reply('POST', LOG_WORKOUT, 200, SENT_ROW)
      wait()
      renderPlans()

      const strength = await planCard('Strength block')
      expect(strength.getByText('Waiting to send')).toBeInTheDocument()

      await syncOutbox()

      const link = await strength.findByRole('link', { name: 'Evening ride' })
      expect(link).toHaveAttribute('href', `/workouts/${SENT_ROW.id}`)
      expect(strength.queryByText('Waiting to send')).not.toBeInTheDocument()
      // It is the first of the plan's workouts, and shown once.
      expect(strength.getAllByRole('listitem')[0]).toContainElement(link)
      expect(strength.getAllByText('Evening ride')).toHaveLength(1)
    })

    it('a workout sent while the list reloads stays in My plans', async () => {
      // The plans as the database lists them once the workout is saved.
      const sent = { id: SENT_ROW.id, title: 'Evening ride', type: 'other', duration_min: 45, created_at: SENT_ROW.created_at }
      const plansWithSent = [{ ...PLANS[0], workouts: [sent, ...PLANS[0].workouts] }, PLANS[1]]
      backend.networkDown('GET', '/rest/v1/plans')
      backend.reply('GET', '/rest/v1/plans', 200, PLANS)
      backend.reply('GET', '/rest/v1/plans', 200, plansWithSent)
      backend.reply('POST', LOG_WORKOUT, 200, SENT_ROW)

      // Offline, My plans shows the saved plans, with the workout waiting.
      saveData('plans', PLANS, SAVED_AT)
      const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      wait()
      renderPlans()
      const strength = await planCard('Strength block')
      expect(strength.getByText('Waiting to send')).toBeInTheDocument()
      await waitFor(() => expect(planLoads()).toHaveLength(1))

      // Back online, the plans load again. That answer is read before the
      // workout is saved (no Evening ride) and arrives last.
      const release = holdNextReply()
      onLine.mockReturnValue(true)
      act(() => window.dispatchEvent(new Event('online')))
      await waitFor(() => expect(planLoads()).toHaveLength(2))

      // Meanwhile the outbox sends the workout, and it becomes a normal row.
      await syncOutbox()
      expect(await strength.findByRole('link', { name: 'Evening ride' })).toBeInTheDocument()

      release()

      // That old answer is not shown: the plans load once more and list it.
      await waitFor(() => expect(screen.queryByText(/Offline: showing data saved on/)).not.toBeInTheDocument())
      expect(strength.getByRole('link', { name: 'Evening ride' })).toHaveAttribute('href', `/workouts/${SENT_ROW.id}`)
      expect(strength.queryByText('Waiting to send')).not.toBeInTheDocument()
      expect(planLoads()).toHaveLength(3)
    })
  })
})
