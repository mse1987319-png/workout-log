import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { listProgress } from './progress'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('progress API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('loads my workouts and sets oldest first, and my goals soonest first', async () => {
    const workouts = [{ id: 'w1', type: 'strength', duration_min: 50, created_at: '2026-11-01T12:00:00+00:00' }]
    const sets = [
      { workout_id: 'w1', exercise: 'Squat', reps: 5, weight_kg: 100, created_at: '2026-11-01T12:00:00+00:00' },
    ]
    const goals = [
      { id: 'g1', exercise: 'Squat', target_kg: 120, target_date: '2026-12-31', created_at: '2026-11-02T08:00:00+00:00' },
    ]
    backend.reply('GET', '/rest/v1/workouts', 200, workouts)
    backend.reply('GET', '/rest/v1/workout_sets', 200, sets)
    backend.reply('GET', '/rest/v1/goals', 200, goals)

    await expect(listProgress()).resolves.toEqual({ workouts, sets, goals })

    const byPath = Object.fromEntries(backend.requests.map((r) => [r.path, r.query]))
    expect(byPath['/rest/v1/workouts'].get('select')).toBe('id,type,duration_min,created_at')
    expect(byPath['/rest/v1/workouts'].get('order')).toBe('created_at.asc')
    expect(byPath['/rest/v1/workout_sets'].get('select')).toBe('workout_id,exercise,reps,weight_kg,created_at')
    expect(byPath['/rest/v1/workout_sets'].get('order')).toBe('created_at.asc')
    expect(byPath['/rest/v1/goals'].get('select')).toBe('id,exercise,target_kg,target_date,created_at')
    expect(byPath['/rest/v1/goals'].get('order')).toBe('target_date.asc,created_at.asc')
  })

  it.each(['/rest/v1/workout_sets', '/rest/v1/goals'])('rejects when %s fails', async (failing) => {
    for (const path of ['/rest/v1/workouts', '/rest/v1/workout_sets', '/rest/v1/goals']) {
      if (path === failing) {
        backend.reply('GET', path, 401, { code: 'PGRST301', message: 'JWT expired', details: null, hint: null })
      } else {
        backend.reply('GET', path, 200, [])
      }
    }

    await expect(listProgress()).rejects.toMatchObject({ code: 'PGRST301' })
  })
})
