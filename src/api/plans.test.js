import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { createPlan, listPlanOptions, listPlans } from './plans'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('plans API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('lists plans newest first, each with its workouts newest first', async () => {
    const rows = [
      {
        id: 'plan-1',
        name: 'Strength block',
        goal: null,
        created_at: '2026-11-10T08:00:00+00:00',
        workouts: [],
      },
    ]
    backend.reply('GET', '/rest/v1/plans', 200, rows)

    await expect(listPlans()).resolves.toEqual(rows)

    const [request] = backend.requests
    expect(request.query.get('select')).toBe(
      'id,name,goal,created_at,workouts(id,title,type,duration_min,created_at)',
    )
    expect(request.query.get('order')).toBe('created_at.desc')
    expect(request.query.get('workouts.order')).toBe('created_at.desc')
  })

  it('throws the Supabase error so the screen can show it', async () => {
    backend.reply('GET', '/rest/v1/plans', 401, {
      code: 'PGRST301',
      message: 'JWT expired',
      details: null,
      hint: null,
    })

    await expect(listPlans()).rejects.toMatchObject({ code: 'PGRST301', message: 'JWT expired' })
  })

  it('lists just the plan names for the workout form', async () => {
    backend.reply('GET', '/rest/v1/plans', 200, [{ id: 'plan-1', name: 'Strength block' }])

    await expect(listPlanOptions()).resolves.toEqual([{ id: 'plan-1', name: 'Strength block' }])

    const [request] = backend.requests
    expect(request.query.get('select')).toBe('id,name')
    expect(request.query.get('order')).toBe('created_at.desc')
  })

  it('creates a plan and returns the saved row', async () => {
    const saved = {
      id: 'plan-2',
      name: '5K plan',
      goal: 'Run 5 km under 30 min',
      created_at: '2026-11-11T10:00:00+00:00',
    }
    backend.reply('POST', '/rest/v1/plans', 201, saved)

    await expect(createPlan({ name: '5K plan', goal: 'Run 5 km under 30 min' })).resolves.toEqual(
      saved,
    )

    const [request] = backend.requests
    // user_id is not sent: the database fills it with auth.uid().
    expect(request.body).toEqual({ name: '5K plan', goal: 'Run 5 km under 30 min' })
    expect(request.query.get('select')).toBe('id,name,goal,created_at')
  })
})
