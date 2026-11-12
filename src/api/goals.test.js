import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { createGoal, deleteGoal } from './goals'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const GOAL = {
  id: 'g1',
  exercise: 'Squat',
  target_kg: 120,
  target_date: '2026-12-31',
  created_at: '2026-11-12T10:00:00+00:00',
}

describe('goals API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('adds a goal and returns the saved row', async () => {
    backend.reply('POST', '/rest/v1/goals', 201, GOAL)

    await expect(createGoal({ exercise: 'Squat', targetKg: 120, targetDate: '2026-12-31' })).resolves.toEqual(GOAL)

    const [request] = backend.requests
    // user_id is not sent: the database fills it with auth.uid().
    expect(request.body).toEqual({ exercise: 'Squat', target_kg: 120, target_date: '2026-12-31' })
    expect(request.query.get('select')).toBe('id,exercise,target_kg,target_date,created_at')
  })

  it('throws what the database refused', async () => {
    backend.reply('POST', '/rest/v1/goals', 400, {
      code: '23514',
      message: 'new row for relation "goals" violates check constraint "goals_target_kg_check"',
      details: null,
      hint: null,
    })

    await expect(createGoal({ exercise: 'Squat', targetKg: 0, targetDate: '2026-12-31' })).rejects.toMatchObject({
      code: '23514',
    })
  })

  it('removes a goal by its id', async () => {
    backend.noContent('DELETE', '/rest/v1/goals')

    await expect(deleteGoal('g1')).resolves.toBeUndefined()

    const [request] = backend.requests
    expect(request.method).toBe('DELETE')
    expect(request.query.get('id')).toBe('eq.g1')
  })

  it('throws when a removal fails', async () => {
    backend.networkDown('DELETE', '/rest/v1/goals')

    await expect(deleteGoal('g1')).rejects.toMatchObject({ message: expect.stringMatching(/fetch/i) })
  })
})
