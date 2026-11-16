import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { createWorkout, getWorkout, renameWorkout } from './workouts'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const SAVED = {
  id: 'workout-1',
  plan_id: 'plan-1',
  user_id: 'user-1',
  title: 'Leg day',
  type: 'strength',
  duration_min: 60,
  activity: null,
  distance_km: null,
  notes: null,
  created_at: '2026-11-11T18:00:00+00:00',
}

describe('workouts API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('logs a workout and its sets in one call to log_workout and returns the saved row', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, SAVED)
    const sets = [
      { exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100 },
      { exercise: 'Squat', set_no: 2, reps: 5, weight_kg: 102.5 },
    ]

    await expect(
      createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60, sets }),
    ).resolves.toEqual(SAVED)

    const [request] = backend.requests
    expect(request.body).toEqual({
      p_plan_id: 'plan-1',
      p_title: 'Leg day',
      p_type: 'strength',
      p_duration_min: 60,
      p_activity: null,
      p_distance_km: null,
      p_notes: null,
      p_sets: sets,
    })
  })

  it('sends cardio details and notes, with no sets', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, { ...SAVED, type: 'other' })

    await createWorkout({
      planId: 'plan-2',
      title: '5 km run',
      type: 'other',
      durationMin: 28,
      activity: 'run',
      distanceKm: 5,
      notes: 'Felt easy',
    })

    expect(backend.requests[0].body).toEqual({
      p_plan_id: 'plan-2',
      p_title: '5 km run',
      p_type: 'other',
      p_duration_min: 28,
      p_activity: 'run',
      p_distance_km: 5,
      p_notes: 'Felt easy',
      p_sets: [],
    })
  })

  it('rejects when Supabase refuses the workout', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 403, {
      code: '42501',
      message: 'new row violates row-level security policy for table "workouts"',
      details: null,
      hint: null,
    })

    await expect(
      createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60 }),
    ).rejects.toMatchObject({ code: '42501' })
  })

  it('sends the id made on the phone and the time Save was pressed', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, SAVED)

    await createWorkout({
      planId: 'plan-1',
      title: 'Leg day',
      type: 'strength',
      durationMin: 60,
      id: 'b2c4e6a8-1d3f-4a5b-8c7d-9e0f1a2b3c4d',
      loggedAt: '2026-11-16T16:42:00.000Z',
    })

    expect(backend.requests[0].body).toMatchObject({
      p_id: 'b2c4e6a8-1d3f-4a5b-8c7d-9e0f1a2b3c4d',
      p_logged_at: '2026-11-16T16:42:00.000Z',
    })
  })

  it('leaves both out when not given', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, SAVED)

    await createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60 })

    const body = backend.requests[0].body
    expect(body).not.toHaveProperty('p_id')
    expect(body).not.toHaveProperty('p_logged_at')
  })

  it('passes an abort signal to the request', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 200, SAVED)
    const controller = new AbortController()

    await createWorkout({
      planId: 'plan-1',
      title: 'Leg day',
      type: 'strength',
      durationMin: 60,
      signal: controller.signal,
    })

    expect(backend.requests[0].signal).toBeInstanceOf(AbortSignal)
  })

  it('reports the HTTP status with an error', async () => {
    backend.reply('POST', '/rest/v1/rpc/log_workout', 403, {
      code: '42501',
      message: 'new row violates row-level security policy for table "workouts"',
      details: null,
      hint: null,
    })

    await expect(
      createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60 }),
    ).rejects.toMatchObject({ code: '42501', status: 403 })
  })

  it('reports status 0 when there was no response', async () => {
    backend.networkDown('POST', '/rest/v1/rpc/log_workout')

    await expect(
      createWorkout({ planId: 'plan-1', title: 'Leg day', type: 'strength', durationMin: 60 }),
    ).rejects.toMatchObject({ status: 0 })
  })

  it('loads one workout with its plan and its sets in entry order', async () => {
    const row = {
      ...SAVED,
      plan: { id: 'plan-1', name: 'Strength block' },
      workout_sets: [{ exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100 }],
    }
    backend.reply('GET', '/rest/v1/workouts', 200, row)

    await expect(getWorkout('workout-1')).resolves.toEqual(row)

    const [request] = backend.requests
    expect(request.query.get('id')).toBe('eq.workout-1')
    expect(request.query.get('select')).toBe(
      'id,title,type,duration_min,activity,distance_km,notes,created_at,plan:plans(id,name),workout_sets(exercise,set_no,reps,weight_kg)',
    )
    expect(request.query.get('workout_sets.order')).toBe('set_no.asc')
  })

  it("rejects with PGRST116 when the workout doesn't exist or isn't yours", async () => {
    backend.reply('GET', '/rest/v1/workouts', 406, {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'The result contains 0 rows',
      hint: null,
    })

    await expect(getWorkout('nope')).rejects.toMatchObject({ code: 'PGRST116' })
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
