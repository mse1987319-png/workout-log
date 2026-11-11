import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { lastSession, listExerciseNames } from './sets'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('sets API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it("returns the exercise's sets from the most recent workout, matching the name in any case", async () => {
    backend.reply('GET', '/rest/v1/workout_sets', 200, [
      { workout_id: 'w2', set_no: 2, reps: 5, weight_kg: 102.5, created_at: '2026-11-10T18:00:00+00:00' },
      { workout_id: 'w2', set_no: 1, reps: 5, weight_kg: 100, created_at: '2026-11-10T18:00:00+00:00' },
      { workout_id: 'w1', set_no: 1, reps: 5, weight_kg: 95, created_at: '2026-11-03T18:00:00+00:00' },
    ])

    await expect(lastSession('squat')).resolves.toEqual({
      date: '2026-11-10T18:00:00+00:00',
      sets: [
        { set_no: 1, reps: 5, weight_kg: 100 },
        { set_no: 2, reps: 5, weight_kg: 102.5 },
      ],
    })

    const [request] = backend.requests
    expect(request.query.get('exercise')).toBe('ilike.squat')
    expect(request.query.get('order')).toBe('created_at.desc,set_no.asc')
    expect(request.query.has('created_at')).toBe(false)
  })

  it('looks only before a given time (the previous session of a logged workout)', async () => {
    backend.reply('GET', '/rest/v1/workout_sets', 200, [])

    await expect(lastSession('Squat', { before: '2026-11-11T18:00:00+00:00' })).resolves.toBeNull()

    expect(backend.requests[0].query.get('created_at')).toBe('lt.2026-11-11T18:00:00+00:00')
  })

  it('treats % and _ in a name literally, not as wildcards', async () => {
    backend.reply('GET', '/rest/v1/workout_sets', 200, [])

    await lastSession('100%_effort')

    expect(backend.requests[0].query.get('exercise')).toBe('ilike.100\\%\\_effort')
  })

  it('lists exercise names once each, most recent spelling first', async () => {
    backend.reply('GET', '/rest/v1/workout_sets', 200, [
      { exercise: 'Squat' },
      { exercise: 'Bench press' },
      { exercise: 'squat' },
      { exercise: 'Squat' },
    ])

    await expect(listExerciseNames()).resolves.toEqual(['Squat', 'Bench press'])

    const [request] = backend.requests
    expect(request.query.get('select')).toBe('exercise')
    expect(request.query.get('order')).toBe('created_at.desc')
  })
})
