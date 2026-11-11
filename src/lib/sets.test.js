import { describe, expect, it } from 'vitest'
import {
  formatPace,
  formatSets,
  groupByExercise,
  lastSessionFrom,
  toSetsPayload,
  validateExercises,
} from './sets'

describe('groupByExercise', () => {
  it('groups sets by exercise in the order they were entered', () => {
    const sets = [
      { exercise: 'Bench press', set_no: 3, reps: 8, weight_kg: 60 },
      { exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100 },
      { exercise: 'Squat', set_no: 2, reps: 5, weight_kg: 100 },
      { exercise: 'squat', set_no: 4, reps: 3, weight_kg: 110 },
    ]
    expect(groupByExercise(sets)).toEqual([
      {
        exercise: 'Squat',
        sets: [
          { set_no: 1, reps: 5, weight_kg: 100 },
          { set_no: 2, reps: 5, weight_kg: 100 },
          { set_no: 4, reps: 3, weight_kg: 110 },
        ],
      },
      { exercise: 'Bench press', sets: [{ set_no: 3, reps: 8, weight_kg: 60 }] },
    ])
  })
})

describe('formatSets', () => {
  it('counts repeated sets and keeps different ones apart', () => {
    expect(
      formatSets([
        { reps: 5, weight_kg: 100 },
        { reps: 5, weight_kg: 100 },
        { reps: 5, weight_kg: 102.5 },
      ]),
    ).toBe('2 × 5 @ 100 kg, 5 @ 102.5 kg')
  })

  it('marks sets without weight as bodyweight', () => {
    expect(formatSets([{ reps: 8, weight_kg: 0 }, { reps: 8, weight_kg: 0 }, { reps: 6, weight_kg: 0 }])).toBe(
      '2 × 8 (bodyweight), 6 (bodyweight)',
    )
  })

  it('does not merge equal sets that are not next to each other', () => {
    expect(formatSets([{ reps: 5, weight_kg: 100 }, { reps: 3, weight_kg: 110 }, { reps: 5, weight_kg: 100 }])).toBe(
      '5 @ 100 kg, 3 @ 110 kg, 5 @ 100 kg',
    )
  })
})

describe('formatPace', () => {
  it('gives minutes per kilometre', () => {
    expect(formatPace(28, 5)).toBe('5:36 /km')
    expect(formatPace(30, 4)).toBe('7:30 /km')
  })

  it('rounds to whole seconds, carrying into the next minute', () => {
    expect(formatPace(20, 3)).toBe('6:40 /km')
    expect(formatPace(59.999, 10)).toBe('6:00 /km')
  })

  it('returns null without a distance', () => {
    expect(formatPace(30, null)).toBeNull()
    expect(formatPace(30, 0)).toBeNull()
  })
})

describe('toSetsPayload', () => {
  it('numbers sets across the whole workout and fills empty weights with 0', () => {
    expect(
      toSetsPayload([
        { name: ' Squat ', sets: [{ reps: '5', weight: '100' }, { reps: '5', weight: '102.5' }] },
        { name: 'Pull-up', sets: [{ reps: '8', weight: '' }] },
      ]),
    ).toEqual([
      { exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100 },
      { exercise: 'Squat', set_no: 2, reps: 5, weight_kg: 102.5 },
      { exercise: 'Pull-up', set_no: 3, reps: 8, weight_kg: 0 },
    ])
  })
})

describe('validateExercises', () => {
  const exercise = (name, sets) => ({ name, sets })
  const set = (reps, weight = '') => ({ reps, weight })

  it('accepts complete exercises, or none at all', () => {
    expect(validateExercises([exercise('Squat', [set('5', '100'), set('5', '0')])])).toBe('')
    expect(validateExercises([])).toBe('')
  })

  it.each([
    [[exercise(' ', [set('5')])], 'Enter a name for exercise 1.'],
    [[exercise('Squat', [])], 'Add at least one set to exercise 1 (Squat).'],
    [[exercise('Squat', [set('5'), set('')])], 'Exercise 1 (Squat), set 2: enter the reps as a whole number from 1 to 1000.'],
    [[exercise('Squat', [set('4.5')])], 'Exercise 1 (Squat), set 1: enter the reps as a whole number from 1 to 1000.'],
    [[exercise('Squat', [set('5', '-5')])], 'Exercise 1 (Squat), set 1: enter the weight in kg from 0 to 1000.'],
    [[exercise('Squat', [set('5', '1001')])], 'Exercise 1 (Squat), set 1: enter the weight in kg from 0 to 1000.'],
    [[exercise('Squat', [set('5')]), exercise('', [set('5')])], 'Enter a name for exercise 2.'],
  ])('explains the first problem: %#', (exercises, message) => {
    expect(validateExercises(exercises)).toBe(message)
  })

  it('allows at most 100 sets in one workout', () => {
    const many = Array.from({ length: 101 }, () => set('5', '20'))
    expect(validateExercises([exercise('Squat', many)])).toBe('A workout can have at most 100 sets.')
  })
})

describe('lastSessionFrom', () => {
  it('takes the sets of the most recent workout only, in set order', () => {
    // As the API returns them: newest first.
    const rows = [
      { workout_id: 'w2', set_no: 2, reps: 5, weight_kg: 102.5, created_at: '2026-11-10T18:00:00+00:00' },
      { workout_id: 'w2', set_no: 1, reps: 5, weight_kg: 100, created_at: '2026-11-10T18:00:00+00:00' },
      { workout_id: 'w1', set_no: 1, reps: 5, weight_kg: 95, created_at: '2026-11-03T18:00:00+00:00' },
    ]
    expect(lastSessionFrom(rows)).toEqual({
      date: '2026-11-10T18:00:00+00:00',
      sets: [
        { set_no: 1, reps: 5, weight_kg: 100 },
        { set_no: 2, reps: 5, weight_kg: 102.5 },
      ],
    })
  })

  it('returns null when there is no history', () => {
    expect(lastSessionFrom([])).toBeNull()
  })
})
