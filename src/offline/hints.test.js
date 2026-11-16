import { beforeEach, describe, expect, it } from 'vitest'
import { setCurrentUser } from './currentUser'
import { savedExerciseNames, savedLastSession } from './hints'
import { saveData } from './savedData'

const NOV_3 = '2026-11-03T18:00:00+00:00'
const NOV_10 = '2026-11-10T18:00:00+00:00'
const NOV_12 = '2026-11-12T18:00:00+00:00'

const row = (workout_id, created_at, set_no, exercise, reps, weight_kg) => ({
  workout_id,
  exercise,
  set_no,
  reps,
  weight_kg,
  created_at,
})

// Saved the way the Progress screen keeps it: listProgress's result, sets oldest first.
function saveProgress(sets) {
  saveData('progress', { workouts: [], sets, goals: [] })
}

beforeEach(() => {
  setCurrentUser('user-1')
})

describe('logging hints from the saved progress', () => {
  it('lists exercise names from the saved progress, most recent first, once each', () => {
    saveProgress([
      row('w1', NOV_3, 1, 'Squat', 5, 95),
      row('w1', NOV_3, 2, 'Bench press', 8, 60),
      row('w2', NOV_10, 1, ' squat ', 5, 100),
      row('w2', NOV_10, 2, 'Deadlift', 3, 140),
    ])

    expect(savedExerciseNames()).toEqual(['squat', 'Deadlift', 'Bench press'])
  })

  it('finds the last session of an exercise, case-insensitively, before a time', () => {
    saveProgress([
      row('w1', NOV_3, 1, 'Squat', 5, 95),
      row('w2', NOV_10, 2, 'squat', 5, 102.5),
      row('w2', NOV_10, 1, 'squat', 5, 100),
      row('w2', NOV_10, 3, 'Bench press', 8, 60),
      row('w3', NOV_12, 1, 'SQUAT', 3, 110),
    ])

    expect(savedLastSession(' Squat ', { before: NOV_12 })).toEqual({
      date: NOV_10,
      sets: [
        { set_no: 1, reps: 5, weight_kg: 100 },
        { set_no: 2, reps: 5, weight_kg: 102.5 },
      ],
    })
    expect(savedLastSession('squat')).toEqual({ date: NOV_12, sets: [{ set_no: 1, reps: 3, weight_kg: 110 }] })
  })

  it('gives undefined without saved progress and null for a new exercise', () => {
    expect(savedLastSession('Squat')).toBeUndefined()
    expect(savedExerciseNames()).toEqual([])

    saveProgress([row('w1', NOV_3, 1, 'Squat', 5, 95)])

    expect(savedLastSession('Deadlift')).toBeNull()
  })
})
