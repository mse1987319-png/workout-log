import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { createPlan, deletePlan, listPlanOptions, listPlans, updatePlan } from './plans'

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
      'id,user_id,name,goal,created_at,workouts(id,title,type,duration_min,created_at)',
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

  it('renames a plan and changes its goal, then returns the saved row', async () => {
    const saved = { id: 'plan-1', user_id: 'u-1', name: 'Renamed', goal: null, created_at: '2026-11-10T08:00:00+00:00' }
    backend.reply('PATCH', '/rest/v1/plans', 200, saved)

    await expect(updatePlan({ id: 'plan-1', name: 'Renamed', goal: null })).resolves.toEqual(saved)

    const [request] = backend.requests
    expect(request.body).toEqual({ name: 'Renamed', goal: null })
    expect(request.query.get('id')).toBe('eq.plan-1')
    expect(request.query.get('select')).toBe('id,user_id,name,goal,created_at')
  })

  it('says so when no plan was changed (not the owner, or already deleted)', async () => {
    backend.reply('PATCH', '/rest/v1/plans', 406, {
      code: 'PGRST116',
      message: 'Cannot coerce the result to a single JSON object',
      details: 'The result contains 0 rows',
      hint: null,
    })

    await expect(updatePlan({ id: 'plan-9', name: 'x', goal: null })).rejects.toMatchObject({ code: 'PGRST116' })
  })

  it('deletes a plan by its id', async () => {
    backend.reply('DELETE', '/rest/v1/plans', 200, [{ id: 'plan-1' }])

    await expect(deletePlan('plan-1')).resolves.toBeUndefined()

    const [request] = backend.requests
    expect(request.query.get('id')).toBe('eq.plan-1')
    expect(request.query.get('select')).toBe('id')
  })

  it('throws when nothing was deleted: not the owner, or the plan is already gone', async () => {
    backend.reply('DELETE', '/rest/v1/plans', 200, [])

    await expect(deletePlan('plan-9')).rejects.toMatchObject({ code: 'PGRST116' })
  })

  it("passes on the database's reason when a plan can't be deleted", async () => {
    backend.reply('DELETE', '/rest/v1/plans', 409, {
      code: '23503',
      message: "Athletes have logged workouts under this plan, so it can't be deleted.",
      details: null,
      hint: null,
    })

    await expect(deletePlan('plan-1')).rejects.toMatchObject({
      message: "Athletes have logged workouts under this plan, so it can't be deleted.",
    })
  })
})
