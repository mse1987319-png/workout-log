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

  it('loads my workouts and my sets, oldest first', async () => {
    const workouts = [{ id: 'w1', type: 'strength', duration_min: 50, created_at: '2026-11-01T12:00:00+00:00' }]
    const sets = [{ workout_id: 'w1', exercise: 'Squat', weight_kg: 100, created_at: '2026-11-01T12:00:00+00:00' }]
    backend.reply('GET', '/rest/v1/workouts', 200, workouts)
    backend.reply('GET', '/rest/v1/workout_sets', 200, sets)

    await expect(listProgress()).resolves.toEqual({ workouts, sets })

    const byPath = Object.fromEntries(backend.requests.map((r) => [r.path, r.query]))
    expect(byPath['/rest/v1/workouts'].get('select')).toBe('id,type,duration_min,created_at')
    expect(byPath['/rest/v1/workouts'].get('order')).toBe('created_at.asc')
    expect(byPath['/rest/v1/workout_sets'].get('select')).toBe('workout_id,exercise,weight_kg,created_at')
    expect(byPath['/rest/v1/workout_sets'].get('order')).toBe('created_at.asc')
  })

  it('rejects when either query fails', async () => {
    backend.reply('GET', '/rest/v1/workouts', 200, [])
    backend.reply('GET', '/rest/v1/workout_sets', 401, { code: 'PGRST301', message: 'JWT expired', details: null, hint: null })

    await expect(listProgress()).rejects.toMatchObject({ code: 'PGRST301' })
  })
})
