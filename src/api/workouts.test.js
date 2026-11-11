import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { createWorkout, renameWorkout } from './workouts'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('workouts API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('logs a workout under a plan and returns the saved row', async () => {
    const saved = {
      id: 'workout-1',
      plan_id: 'plan-1',
      title: 'Leg day',
      type: 'strength',
      duration_min: 60,
      created_at: '2026-11-11T18:00:00+00:00',
    }
    backend.reply('POST', '/rest/v1/workouts', 201, saved)

    await expect(
      createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60 }),
    ).resolves.toEqual(saved)

    const [request] = backend.requests
    expect(request.body).toEqual({
      plan_id: 'plan-1',
      title: 'Leg day',
      type: 'strength',
      duration_min: 60,
    })
  })

  it('rejects when Supabase refuses the new row', async () => {
    backend.reply('POST', '/rest/v1/workouts', 403, {
      code: '42501',
      message: 'new row violates row-level security policy for table "workouts"',
      details: null,
      hint: null,
    })

    await expect(
      createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60 }),
    ).rejects.toMatchObject({ code: '42501' })
  })

  it('renames exactly one workout, chosen by id', async () => {
    backend.reply('PATCH', '/rest/v1/workouts', 200, { id: 'workout-1', title: 'Heavy leg day' })

    await expect(renameWorkout('workout-1', 'Heavy leg day')).resolves.toEqual({
      id: 'workout-1',
      title: 'Heavy leg day',
    })

    const [request] = backend.requests
    expect(request.query.get('id')).toBe('eq.workout-1')
    expect(request.body).toEqual({ title: 'Heavy leg day' })
  })
})
