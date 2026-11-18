import { beforeEach, describe, expect, it } from 'vitest'
import { setCurrentUser } from './currentUser'
import { addSentWorkout, savePlans, withSentWorkout } from './plansCache'
import { readSaved, readSavedFor, saveData } from './savedData'

const OLDER = { id: 'w1', title: 'Easy run', type: 'other', duration_min: 30, created_at: '2026-11-09T07:00:00+00:00' }
const NEWER = { id: 'w2', title: 'Leg day', type: 'strength', duration_min: 60, created_at: '2026-11-12T18:00:00+00:00' }
const PLANS = [
  {
    id: 'plan-1',
    user_id: 'user-1',
    name: 'Strength block',
    goal: 'Squat 100 kg',
    created_at: '2026-11-01T08:00:00+00:00',
    workouts: [NEWER, OLDER],
  },
  { id: 'plan-2', user_id: 'user-1', name: '5K plan', goal: null, created_at: '2026-10-01T08:00:00+00:00', workouts: [] },
]
const OPTIONS = [
  { id: 'plan-1', name: 'Strength block' },
  { id: 'plan-2', name: '5K plan' },
]
// What log_workout answers: the whole row, logged between the two above.
const SENT = {
  id: 'w3',
  plan_id: 'plan-1',
  user_id: 'user-1',
  title: 'Tempo run',
  type: 'other',
  duration_min: 40,
  activity: 'run',
  distance_km: 8,
  notes: 'Windy',
  created_at: '2026-11-10T07:00:00+00:00',
}
// The same workout as My plans lists it (listPlans' columns).
const LISTED = { id: 'w3', title: 'Tempo run', type: 'other', duration_min: 40, created_at: '2026-11-10T07:00:00+00:00' }

describe('withSentWorkout', () => {
  it("lists a sent workout under its plan, with My plans' columns, newest first", () => {
    expect(withSentWorkout(PLANS, SENT)).toEqual([{ ...PLANS[0], workouts: [NEWER, LISTED, OLDER] }, PLANS[1]])
  })

  it('lists it once', () => {
    const once = withSentWorkout(PLANS, SENT)

    expect(withSentWorkout(once, SENT)).toBe(once)
  })

  it('leaves the plans as they are when its plan is not among them', () => {
    expect(withSentWorkout(PLANS, { ...SENT, plan_id: 'plan-gone' })).toBe(PLANS)
    expect(withSentWorkout(null, SENT)).toBeNull()
  })
})

describe('the saved plans', () => {
  beforeEach(() => {
    setCurrentUser('user-1')
  })

  it('keeps the plan list of the Log workout screen in step, saved at the same time', () => {
    savePlans('plans', PLANS, 2000)

    expect(readSaved('plans')).toEqual({ data: PLANS, savedAt: 2000 })
    expect(readSaved('planOptions')).toEqual({ data: OPTIONS, savedAt: 2000 })
  })

  it('never replaces a newer plan list with older plans', () => {
    const newer = [{ id: 'plan-3', name: 'Hill sprints' }, ...OPTIONS]
    saveData('planOptions', newer, 3000)

    savePlans('plans', PLANS, 2000)
    expect(readSaved('plans')).toEqual({ data: PLANS, savedAt: 2000 })
    expect(readSaved('planOptions')).toEqual({ data: newer, savedAt: 3000 })

    // Plans as new as the list replace it.
    savePlans('plans', PLANS, 3000)
    expect(readSaved('planOptions')).toEqual({ data: OPTIONS, savedAt: 3000 })
  })

  it("adds a sent workout to its owner's saved plans, keeping that copy's time", () => {
    savePlans('plans', PLANS, 2000)
    // Someone else is signed in by the time the answer comes.
    setCurrentUser('user-2')
    saveData('plans', [{ ...PLANS[0], workouts: [] }], 5000)

    addSentWorkout('user-1', SENT)

    expect(readSavedFor('user-1', 'plans')).toEqual({
      data: [{ ...PLANS[0], workouts: [NEWER, LISTED, OLDER] }, PLANS[1]],
      savedAt: 2000,
    })
    expect(readSavedFor('user-1', 'planOptions')).toEqual({ data: OPTIONS, savedAt: 2000 })
    expect(readSaved('plans')).toEqual({ data: [{ ...PLANS[0], workouts: [] }], savedAt: 5000 })
  })

  it('saves nothing for a sent workout without a saved copy (none yet, or logged out)', () => {
    addSentWorkout('user-1', SENT)

    expect(readSavedFor('user-1', 'plans')).toBeNull()
    expect(readSavedFor('user-1', 'planOptions')).toBeNull()
  })
})
