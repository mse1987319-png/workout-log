import { render, screen } from '@testing-library/react'
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

function savedPlan(overrides) {
  return {
    id: 'plan-3',
    name: 'Strength block',
    goal: null,
    created_at: '2026-11-11T09:00:00+00:00',
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
      const user = renderLog()

      expect(
        await screen.findByText(
          'No plans yet — create your first plan below, then log workouts under it.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Plan')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Create your first plan' }))
      expect(screen.getByLabelText('Plan name')).toHaveFocus()
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

  describe('new plan', () => {
    it('creates a plan and picks it for the next workout', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, [])
      backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ goal: 'Squat 100 kg' }))
      const user = renderLog()

      await user.type(await screen.findByLabelText('Plan name'), ' Strength block ')
      await user.type(screen.getByLabelText('Goal (optional)'), 'Squat 100 kg')
      await user.click(screen.getByRole('button', { name: 'Create plan' }))

      expect(await screen.findByText('Plan created: Strength block.')).toBeInTheDocument()
      expect(posts('/rest/v1/plans')[0].body).toEqual({ name: 'Strength block', goal: 'Squat 100 kg' })
      expect(screen.getByLabelText('Plan')).toHaveValue('plan-3')
      expect(screen.getByLabelText('Plan name')).toHaveValue('')
    })

    it('stores a blank goal as no goal', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, [])
      backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ name: '5K plan' }))
      const user = renderLog()

      await user.type(await screen.findByLabelText('Plan name'), '5K plan')
      await user.type(screen.getByLabelText('Goal (optional)'), '   ')
      await user.click(screen.getByRole('button', { name: 'Create plan' }))

      await screen.findByText('Plan created: 5K plan.')
      expect(posts('/rest/v1/plans')[0].body).toEqual({ name: '5K plan', goal: null })
    })

    it('needs a plan name', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, [])
      const user = renderLog()

      await user.type(await screen.findByLabelText('Plan name'), '   ')
      await user.click(screen.getByRole('button', { name: 'Create plan' }))

      expect(screen.getByRole('alert')).toHaveTextContent('Enter a plan name.')
      expect(posts('/rest/v1/plans')).toHaveLength(0)
    })

    it('explains a failed plan save and retries it', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, [])
      backend.networkDown('POST', '/rest/v1/plans')
      backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ name: '5K plan' }))
      const user = renderLog()

      await user.type(await screen.findByLabelText('Plan name'), '5K plan')
      await user.click(screen.getByRole('button', { name: 'Create plan' }))
      expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")

      await user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByText('Plan created: 5K plan.')).toBeInTheDocument()
    })

    it('still creates a plan when the plan list failed to load', async () => {
      backend.networkDown('GET', '/rest/v1/plans')
      backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ name: '5K plan' }))
      const user = renderLog()
      await screen.findByRole('alert')

      await user.type(screen.getByLabelText('Plan name'), '5K plan')
      await user.click(screen.getByRole('button', { name: 'Create plan' }))

      expect(await screen.findByText('Plan created: 5K plan.')).toBeInTheDocument()
    })
  })

  describe('new workout', () => {
    it('logs a workout, confirms it and clears the form for the next one', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.reply('POST', '/rest/v1/workouts', 201, savedWorkout({ plan_id: 'plan-2' }))
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { plan: '5K plan', title: '  Leg day ', type: 'Strength', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      const status = await screen.findByRole('status')
      expect(status).toHaveTextContent('Workout saved: Leg day.')
      expect(screen.getByRole('link', { name: 'See it in My plans' })).toHaveAttribute('href', '/')
      expect(posts('/rest/v1/workouts')[0].body).toEqual({
        plan_id: 'plan-2',
        title: 'Leg day',
        type: 'strength',
        duration_min: 60,
      })
      expect(screen.getByLabelText('Plan')).toHaveValue('plan-2')
      expect(screen.getByLabelText('Title')).toHaveValue('')
      expect(screen.getByRole('radio', { name: 'Strength' })).not.toBeChecked()
      expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(null)
    })

    it('sends type "other" for cardio and similar workouts', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.reply('POST', '/rest/v1/workouts', 201, savedWorkout({ title: '5 km run', type: 'other' }))
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: '5 km run', type: /^Other/, duration: '30' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      await screen.findByText(/Workout saved/)
      expect(posts('/rest/v1/workouts')[0].body).toMatchObject({ type: 'other', duration_min: 30 })
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

      expect(posts('/rest/v1/workouts')).toHaveLength(0)
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
      expect(posts('/rest/v1/workouts')).toHaveLength(0)
    })

    it('shows Saving… while the workout is being saved', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.hang('POST', '/rest/v1/workouts')
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: 'Leg day', type: 'Strength', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    })

    it('explains a failed save, keeps the form and retries', async () => {
      backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
      backend.networkDown('POST', '/rest/v1/workouts')
      backend.reply('POST', '/rest/v1/workouts', 201, savedWorkout())
      const user = renderLog()
      await screen.findByLabelText('Plan')

      await fillWorkout(user, { title: 'Leg day', type: 'Strength', duration: '60' })
      await user.click(screen.getByRole('button', { name: 'Save workout' }))

      expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
      expect(screen.getByLabelText('Title')).toHaveValue('Leg day')

      await user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Workout saved: Leg day.')
      const sent = posts('/rest/v1/workouts')
      expect(sent).toHaveLength(2)
      expect(sent[1].body).toEqual(sent[0].body)
    })
  })
})
