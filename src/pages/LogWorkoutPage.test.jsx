import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import LogWorkoutPage from './LogWorkoutPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const PLAN_OPTIONS = [
  { id: 'plan-1', name: 'Strength block' },
  { id: 'plan-2', name: '5K plan' },
]

function savedWorkout(overrides) {
  return {
    id: 'workout-9',
    plan_id: 'plan-1',
    title: 'Leg day',
    type: 'strength',
    duration_min: 60,
    created_at: '2026-11-11T18:00:00+00:00',
    ...overrides,
  }
}

function renderLog(path = '/log') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/log" element={<LogWorkoutPage />} />
        <Route path="/" element={<p>my plans page</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function fillWorkout(user, { plan, title, type, duration }) {
  if (plan) await user.selectOptions(screen.getByLabelText('Plan'), plan)
  if (title !== undefined) await user.type(screen.getByLabelText('Title'), title)
  if (type) await user.click(screen.getByRole('radio', { name: type }))
  if (duration !== undefined) await user.type(screen.getByLabelText('Duration (minutes)'), duration)
}

const posts = (path) =>
  backend.requests.filter((request) => request.method === 'POST' && request.path === path)

describe('LogWorkoutPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  describe('plan list', () => {
    it('shows the Loading state while the plans load', () => {
      backend.hang('GET', '/rest/v1/plans')
      renderLog()

      expect(screen.getByRole('status')).toHaveTextContent('Loading your plans…')
    })

    it('shows the Error state and loads again on Try again', async () => {
      backend.networkDown('GET', '/rest/v1/plans')
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      const user = renderLog()

      expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(await screen.findByLabelText('Plan')).toBeInTheDocument()
    })

    it('asks a new user to create their first plan (Empty state)', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, [])
      renderLog()

      expect(
        await screen.findByText('No plans yet — create a plan first, then log workouts under it.'),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Plan')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Create your first plan' })).toHaveAttribute('href', '/plans/new')
    })

    it('no longer has the plan form (plans are created on their own page)', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      renderLog()

      await screen.findByLabelText('Plan')
      expect(screen.queryByLabelText('Plan name')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'New plan' })).not.toBeInTheDocument()
    })

    it('starts with the plan chosen on the Plans screen', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      renderLog('/log?plan=plan-2')

      expect(await screen.findByLabelText('Plan')).toHaveValue('plan-2')
    })

    it('falls back to the newest plan when the address names an unknown one', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      renderLog('/log?plan=deleted-plan')

      expect(await screen.findByLabelText('Plan')).toHaveValue('plan-1')
    })
  })

  describe('new workout', () => {
    it('logs a workout, confirms it and clears the form for the next one', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout({ plan_id: 'plan-2' }))
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { plan: '5K plan', title: '  Leg day ', type: 'Strength', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      const status = await screen.findByRole('status')
      expect(status).toHaveTextContent('Workout saved: Leg day.')
      expect(screen.getByRole('link', { name: 'See it in My plans' })).toHaveAttribute('href', '/')
      expect(posts('/rest/v1/rpc/log_workout')[0].body).toEqual({
        p_plan_id: 'plan-2',
        p_title: 'Leg day',
        p_type: 'strength',
        p_duration_min: 60,
        p_activity: null,
        p_distance_km: null,
        p_notes: null,
        p_sets: [],
      })
      expect(screen.getByLabelText('Plan')).toHaveValue('plan-2')
      expect(screen.getByLabelText('Title')).toHaveValue('')
      expect(screen.getByRole('radio', { name: 'Strength' })).not.toBeChecked()
      expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(null)
    })

    it('sends type "other" for cardio and similar workouts', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout({ title: '5 km run', type: 'other' }))
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: '5 km run', type: /^Other/, duration: '30' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      await screen.findByText(/Workout saved/)
      expect(posts('/rest/v1/rpc/log_workout')[0].body).toMatchObject({ p_type: 'other', p_duration_min: 30 })
    })

    it('needs a title and a type before saving', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await user.click(screen.getByRole('button', { name: 'Save workout' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a title.')

      await fillWorkout(user, { title: 'Leg day', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Choose a type: Strength or Other.')

      expect(posts('/rest/v1/rpc/log_workout')).toHaveLength(0)
    })

    it.each(['', '0', '45.5', '1441'])('rejects the duration "%s"', async (duration) => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: 'Leg day', type: 'Strength', duration: duration || undefined })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Enter the duration in whole minutes (1–1440).',
      )
      expect(posts('/rest/v1/rpc/log_workout')).toHaveLength(0)
    })

    it('shows Saving… while the workout is being saved', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.hang('POST', '/rest/v1/rpc/log_workout')
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: 'Leg day', type: 'Strength', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    })

    it('explains a failed save, keeps the form and retries', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.networkDown('POST', '/rest/v1/rpc/log_workout')
      backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout())
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: 'Leg day', type: 'Strength', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
      expect(screen.getByLabelText('Title')).toHaveValue('Leg day')

      await user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Workout saved: Leg day.')
      const sent = posts('/rest/v1/rpc/log_workout')
      expect(sent).toHaveLength(2)
      expect(sent[1].body).toEqual(sent[0].body)
    })
  })
})

describe('LogWorkoutPage: exercises and cardio details', () => {
  beforeEach(() => {
    backend.reset()
    backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
    // Exercise names and history: none unless a test says otherwise.
    backend.reply('GET', '/rest/v1/workout_sets', 200, [])
  })

  async function startStrength(user) {
    await screen.findByLabelText('Plan')
    await fillWorkout(user, { title: 'Leg day', type: 'Strength', duration: '60' })
  }

  it('logs a strength workout with its exercises and sets', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout({ id: 'workout-7' }))
    const user = renderLog()
    await startStrength(user)

    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 1 name'), 'Squat')
    await user.type(screen.getByLabelText('Exercise 1, set 1 reps'), '5')
    await user.type(screen.getByLabelText('Exercise 1, set 1 kg'), '105')
    await user.click(screen.getByRole('button', { name: 'Add set to exercise 1' }))
    expect(screen.getByLabelText('Exercise 1, set 2 reps')).toHaveValue(5)
    expect(screen.getByLabelText('Exercise 1, set 2 kg')).toHaveValue(105)
    await user.clear(screen.getByLabelText('Exercise 1, set 2 kg'))
    await user.type(screen.getByLabelText('Exercise 1, set 2 kg'), '107.5')

    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 2 name'), ' Pull-up ')
    await user.type(screen.getByLabelText('Exercise 2, set 1 reps'), '8')

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Workout saved: Leg day.')
    expect(posts('/rest/v1/rpc/log_workout')[0].body).toMatchObject({
      p_type: 'strength',
      p_activity: null,
      p_distance_km: null,
      p_sets: [
        { exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 105 },
        { exercise: 'Squat', set_no: 2, reps: 5, weight_kg: 107.5 },
        { exercise: 'Pull-up', set_no: 3, reps: 8, weight_kg: 0 },
      ],
    })
    expect(screen.getByRole('link', { name: 'Open it' })).toHaveAttribute('href', '/workouts/workout-7')
    expect(screen.queryByLabelText('Exercise 1 name')).not.toBeInTheDocument()
  })

  it("shows last time's sets for an exercise, or that it is the first time", async () => {
    backend.replyWhen(
      'GET',
      '/rest/v1/workout_sets',
      (request) => request.query.get('exercise') === 'ilike.Squat',
      200,
      [
        { workout_id: 'w1', set_no: 1, reps: 5, weight_kg: 100, created_at: '2026-11-10T18:00:00+00:00' },
        { workout_id: 'w1', set_no: 2, reps: 5, weight_kg: 100, created_at: '2026-11-10T18:00:00+00:00' },
      ],
    )
    const user = renderLog()
    await startStrength(user)

    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 1 name'), 'Squat')
    await user.tab()
    expect(await screen.findByText(/^Last time \(.+\): 2 × 5 @ 100 kg$/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 2 name'), 'Lunge')
    await user.tab()
    expect(await screen.findByText('First time logging Lunge.')).toBeInTheDocument()
  })

  it('suggests exercise names used before', async () => {
    backend.replyWhen(
      'GET',
      '/rest/v1/workout_sets',
      (request) => request.query.get('select') === 'exercise',
      200,
      [{ exercise: 'Squat' }, { exercise: 'Bench press' }],
    )
    const user = renderLog()
    await startStrength(user)
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))

    const input = screen.getByLabelText('Exercise 1 name')
    await waitFor(() => {
      const listId = input.getAttribute('list')
      const options = [...document.querySelectorAll(`datalist[id="${listId}"] option`)].map((o) => o.value)
      expect(options).toEqual(['Squat', 'Bench press'])
    })
  })

  it('explains a problem in the exercises and does not save', async () => {
    const user = renderLog()
    await startStrength(user)
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 1, set 1 reps'), '5')

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name for exercise 1.')
    expect(posts('/rest/v1/rpc/log_workout')).toHaveLength(0)
  })

  it('removes a set and an exercise', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout())
    const user = renderLog()
    await startStrength(user)
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 1 name'), 'Squat')
    await user.type(screen.getByLabelText('Exercise 1, set 1 reps'), '5')
    await user.click(screen.getByRole('button', { name: 'Add set to exercise 1' }))
    await user.click(screen.getByRole('button', { name: 'Remove set 2 of exercise 1' }))
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.click(screen.getByRole('button', { name: 'Remove exercise 2' }))

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    await screen.findByText(/Workout saved/)
    expect(posts('/rest/v1/rpc/log_workout')[0].body.p_sets).toEqual([
      { exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 0 },
    ])
  })

  it('logs a run with its activity, distance and notes', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout({ type: 'other' }))
    const user = renderLog()
    await screen.findByLabelText('Plan')
    await fillWorkout(user, { title: 'Easy run', type: /^Other/, duration: '28' })
    await user.selectOptions(screen.getByLabelText('Activity'), 'Run')
    await user.type(screen.getByLabelText('Distance (km)'), '5.25')
    await user.type(screen.getByLabelText('Notes (optional)'), '  Felt easy ')

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    await screen.findByText(/Workout saved/)
    expect(posts('/rest/v1/rpc/log_workout')[0].body).toMatchObject({
      p_type: 'other',
      p_activity: 'run',
      p_distance_km: 5.25,
      p_notes: 'Felt easy',
      p_sets: [],
    })
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue('')
  })

  it.each(['0', '1000.5'])('rejects the distance "%s"', async (distance) => {
    const user = renderLog()
    await screen.findByLabelText('Plan')
    await fillWorkout(user, { title: 'Run', type: /^Other/, duration: '30' })
    await user.type(screen.getByLabelText('Distance (km)'), distance)

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the distance in km (more than 0, up to 1000), or leave it empty.',
    )
    expect(posts('/rest/v1/rpc/log_workout')).toHaveLength(0)
  })

  it('sends no sets when the type is switched to Other', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout({ type: 'other' }))
    const user = renderLog()
    await startStrength(user)
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 1 name'), 'Squat')
    await user.type(screen.getByLabelText('Exercise 1, set 1 reps'), '5')
    await user.click(screen.getByRole('radio', { name: /^Other/ }))

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    await screen.findByText(/Workout saved/)
    expect(posts('/rest/v1/rpc/log_workout')[0].body).toMatchObject({ p_type: 'other', p_sets: [] })
  })

  it('sends no cardio details when the type is switched to Strength', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, savedWorkout())
    const user = renderLog()
    await screen.findByLabelText('Plan')
    await fillWorkout(user, { title: 'Run', type: /^Other/, duration: '30' })
    await user.selectOptions(screen.getByLabelText('Activity'), 'Run')
    await user.type(screen.getByLabelText('Distance (km)'), '5')
    await user.click(screen.getByRole('radio', { name: 'Strength' }))

    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    await screen.findByText(/Workout saved/)
    expect(posts('/rest/v1/rpc/log_workout')[0].body).toMatchObject({
      p_type: 'strength',
      p_activity: null,
      p_distance_km: null,
    })
  })
})
