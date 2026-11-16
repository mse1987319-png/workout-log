import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { ATHLETE, INSTRUCTOR } from '../test/fakeSupabase'
import { setCurrentUser } from './currentUser'
import { readSaved } from './savedData'
import { warmUp } from './warmUp'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const PLAN_OPTIONS = [{ id: 'plan-1', name: 'Strength block' }]
const PROGRESS = {
  workouts: [{ id: 'w1', type: 'strength', duration_min: 50, created_at: '2026-11-10T18:00:00+00:00' }],
  sets: [{ workout_id: 'w1', exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100, created_at: '2026-11-10T18:00:00+00:00' }],
  goals: [],
}
const PROFILE = { role: 'instructor', invite_code: 'K7P2QX' }
const ATHLETES = [{ athlete_id: 'a-1', email: 'anna@example.com', workouts_last_7_days: 3 }]

function replyWithEverything() {
  backend.reply('GET', '/rest/v1/plans', 200, PLAN_OPTIONS)
  backend.reply('GET', '/rest/v1/workouts', 200, PROGRESS.workouts)
  backend.reply('GET', '/rest/v1/workout_sets', 200, PROGRESS.sets)
  backend.reply('GET', '/rest/v1/goals', 200, PROGRESS.goals)
  backend.reply('GET', '/rest/v1/profiles', 200, [PROFILE])
  backend.reply('POST', '/rest/v1/rpc/my_athletes', 200, ATHLETES)
}

describe('warmUp', () => {
  beforeEach(() => {
    backend.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saves plan options and progress, and athletes for instructors', async () => {
    replyWithEverything()

    setCurrentUser(ATHLETE.id)
    await warmUp('athlete')
    expect(readSaved('planOptions').data).toEqual(PLAN_OPTIONS)
    expect(readSaved('progress').data).toEqual(PROGRESS)
    expect(readSaved('athletes')).toBeNull()

    setCurrentUser(INSTRUCTOR.id)
    await warmUp('instructor')
    expect(readSaved('planOptions').data).toEqual(PLAN_OPTIONS)
    expect(readSaved('progress').data).toEqual(PROGRESS)
    expect(readSaved('athletes').data).toEqual({ profile: PROFILE, athletes: ATHLETES })
  })

  it('does nothing offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    setCurrentUser(ATHLETE.id)

    await warmUp('athlete')

    expect(backend.requests).toHaveLength(0)
    expect(readSaved('planOptions')).toBeNull()
  })

  it('does nothing without a signed-in user', async () => {
    await warmUp('athlete')

    expect(backend.requests).toHaveLength(0)
  })

  it('ignores a failing request and still saves the rest', async () => {
    backend.networkDown('GET', '/rest/v1/plans')
    backend.reply('GET', '/rest/v1/workouts', 200, PROGRESS.workouts)
    backend.reply('GET', '/rest/v1/workout_sets', 200, PROGRESS.sets)
    backend.reply('GET', '/rest/v1/goals', 200, PROGRESS.goals)
    setCurrentUser(ATHLETE.id)

    await warmUp('athlete')

    expect(readSaved('planOptions')).toBeNull()
    expect(readSaved('progress').data).toEqual(PROGRESS)
  })

  it('does not file the data under another user when the account changes meanwhile', async () => {
    replyWithEverything()
    setCurrentUser(ATHLETE.id)

    const warming = warmUp('athlete')
    setCurrentUser(INSTRUCTOR.id)
    await warming

    expect(readSaved('planOptions')).toBeNull()
    expect(readSaved('progress')).toBeNull()
    setCurrentUser(ATHLETE.id)
    expect(readSaved('planOptions')).toBeNull()
    expect(readSaved('progress')).toBeNull()
  })
})
