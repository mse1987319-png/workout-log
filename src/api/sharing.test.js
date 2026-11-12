import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import {
  assignPlan,
  getAthleteProgress,
  getMyProfile,
  linkInstructor,
  listAssignments,
  listMyAthletes,
  listMyInstructors,
  stopSharing,
  unassignPlan,
} from './sharing'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const JWT_EXPIRED = { code: 'PGRST301', message: 'JWT expired', details: null, hint: null }
const ASSIGNMENT = { plan_id: 'plan-1', created_at: '2026-11-12T09:00:00+00:00', plan: { id: 'plan-1', name: '5 × 5' } }

describe('sharing API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('reads my own profile: role and invite code', async () => {
    backend.reply('GET', '/rest/v1/profiles', 200, [{ role: 'instructor', invite_code: 'K7P2QX' }])

    await expect(getMyProfile()).resolves.toEqual({ role: 'instructor', invite_code: 'K7P2QX' })
    expect(backend.requests[0].query.get('select')).toBe('role,invite_code')
  })

  it('treats a missing profile as an athlete without a code', async () => {
    backend.reply('GET', '/rest/v1/profiles', 200, [])

    await expect(getMyProfile()).resolves.toEqual({ role: 'athlete', invite_code: null })
  })

  it('links me to an instructor by code', async () => {
    const linked = { instructor_id: 'i-1', email: 'coach@example.com', linked_at: '2026-11-12T09:00:00+00:00' }
    backend.reply('POST', '/rest/v1/rpc/link_instructor', 200, linked)

    await expect(linkInstructor('k7p2qx')).resolves.toEqual(linked)
    expect(backend.requests[0].body).toEqual({ p_code: 'k7p2qx' })
  })

  it('passes on why a code was refused', async () => {
    backend.reply('POST', '/rest/v1/rpc/link_instructor', 400, {
      code: 'P0002',
      message: 'No instructor has that code. Check it and try again.',
      details: null,
      hint: null,
    })

    await expect(linkInstructor('WRONG1')).rejects.toMatchObject({
      message: 'No instructor has that code. Check it and try again.',
    })
  })

  it('lists the instructors I share with', async () => {
    const rows = [{ instructor_id: 'i-1', email: 'coach@example.com', linked_at: '2026-11-12T09:00:00+00:00' }]
    backend.reply('POST', '/rest/v1/rpc/my_instructors', 200, rows)

    await expect(listMyInstructors()).resolves.toEqual(rows)
  })

  it('stops sharing with one instructor', async () => {
    backend.noContent('DELETE', '/rest/v1/instructor_links')

    await expect(stopSharing('i-1')).resolves.toBeUndefined()
    expect(backend.requests[0].query.get('instructor_id')).toBe('eq.i-1')
  })

  it('lists the athletes who share with me', async () => {
    const rows = [{ athlete_id: 'a-1', email: 'athlete@example.com', workouts_last_7_days: 3 }]
    backend.reply('POST', '/rest/v1/rpc/my_athletes', 200, rows)

    await expect(listMyAthletes()).resolves.toEqual(rows)
  })

  it("reads one athlete's progress through the database function", async () => {
    const progress = { athlete: { id: 'a-1', email: 'athlete@example.com' }, workouts: [], sets: [], goals: [], reports: [] }
    backend.reply('POST', '/rest/v1/rpc/athlete_progress', 200, progress)

    await expect(getAthleteProgress('a-1')).resolves.toEqual(progress)
    expect(backend.requests[0].body).toEqual({ p_athlete: 'a-1' })
  })

  it('throws when an athlete does not share with me', async () => {
    backend.reply('POST', '/rest/v1/rpc/athlete_progress', 403, {
      code: '42501',
      message: 'This athlete is not sharing with you.',
      details: null,
      hint: null,
    })

    await expect(getAthleteProgress('a-2')).rejects.toMatchObject({ code: '42501' })
  })

  it("lists my plans assigned to an athlete, with each plan's name", async () => {
    backend.reply('GET', '/rest/v1/plan_assignments', 200, [ASSIGNMENT])

    await expect(listAssignments('a-1')).resolves.toEqual([ASSIGNMENT])
    const { query } = backend.requests[0]
    expect(query.get('select')).toBe('plan_id,created_at,plan:plans(id,name)')
    expect(query.get('athlete_id')).toBe('eq.a-1')
    expect(query.get('order')).toBe('created_at.asc')
  })

  it('assigns a plan to an athlete', async () => {
    backend.reply('POST', '/rest/v1/plan_assignments', 201, ASSIGNMENT)

    await expect(assignPlan({ planId: 'plan-1', athleteId: 'a-1' })).resolves.toEqual(ASSIGNMENT)
    // assigned_by is not sent: the database fills it with auth.uid().
    expect(backend.requests[0].body).toEqual({ plan_id: 'plan-1', athlete_id: 'a-1' })
  })

  it('unassigns a plan from an athlete', async () => {
    backend.noContent('DELETE', '/rest/v1/plan_assignments')

    await expect(unassignPlan({ planId: 'plan-1', athleteId: 'a-1' })).resolves.toBeUndefined()
    const { query } = backend.requests[0]
    expect(query.get('plan_id')).toBe('eq.plan-1')
    expect(query.get('athlete_id')).toBe('eq.a-1')
  })

  it.each([
    ['GET', '/rest/v1/profiles', () => getMyProfile()],
    ['POST', '/rest/v1/rpc/my_instructors', () => listMyInstructors()],
    ['POST', '/rest/v1/rpc/my_athletes', () => listMyAthletes()],
    ['GET', '/rest/v1/plan_assignments', () => listAssignments('a-1')],
  ])('throws the error of %s %s', async (method, path, call) => {
    backend.reply(method, path, 401, JWT_EXPIRED)

    await expect(call()).rejects.toMatchObject({ code: 'PGRST301' })
  })
})
