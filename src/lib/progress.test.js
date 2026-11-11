import { describe, expect, it } from 'vitest'
import { describeTrend, describeWeek, heaviestPerSession, weeklyMinutes, weightedExercises } from './progress'

// Mid-day UTC timestamps, so local dates match in any European time zone.
const set = (workout_id, exercise, weight_kg, created_at) => ({ workout_id, exercise, weight_kg, created_at })

describe('weightedExercises', () => {
  it('lists exercises lifted with weight, most-trained first, in their latest spelling', () => {
    const sets = [
      set('w1', 'Squat', 100, '2026-11-01T12:00:00Z'),
      set('w1', 'Pull-up', 0, '2026-11-01T12:00:00Z'),
      set('w2', 'Bench press', 60, '2026-11-03T12:00:00Z'),
      set('w3', 'squat', 105, '2026-11-05T12:00:00Z'),
      set('w3', 'Squat', 105, '2026-11-05T12:00:00Z'),
    ]
    expect(weightedExercises(sets)).toEqual(['Squat', 'Bench press'])
  })

  it('breaks ties alphabetically', () => {
    const sets = [set('w1', 'Row', 50, '2026-11-01T12:00:00Z'), set('w1', 'Bench press', 60, '2026-11-01T12:00:00Z')]
    expect(weightedExercises(sets)).toEqual(['Bench press', 'Row'])
  })
})

describe('heaviestPerSession', () => {
  it('takes the heaviest set of each workout, oldest first, ignoring case and bodyweight sets', () => {
    const sets = [
      set('w2', 'squat', 105, '2026-11-05T12:00:00Z'),
      set('w1', 'Squat', 95, '2026-11-01T12:00:00Z'),
      set('w1', 'Squat', 100, '2026-11-01T12:00:00Z'),
      set('w2', 'Squat', 0, '2026-11-05T12:00:00Z'),
      set('w3', 'Bench press', 60, '2026-11-06T12:00:00Z'),
      set('w4', 'Squat', 0, '2026-11-07T12:00:00Z'),
    ]
    expect(heaviestPerSession(sets, 'SQUAT')).toEqual([
      { date: '2026-11-01T12:00:00Z', kg: 100 },
      { date: '2026-11-05T12:00:00Z', kg: 105 },
    ])
  })
})

describe('weeklyMinutes', () => {
  it('adds up minutes per week (weeks start on Monday) for the last weeks, oldest first', () => {
    const now = new Date('2026-11-11T12:00:00Z') // a Wednesday
    const workouts = [
      { type: 'strength', duration_min: 60, created_at: '2026-11-10T12:00:00Z' }, // Tue, this week
      { type: 'other', duration_min: 30, created_at: '2026-11-09T12:00:00Z' }, // Mon, this week
      { type: 'strength', duration_min: 45, created_at: '2026-11-08T12:00:00Z' }, // Sun, last week
      { type: 'other', duration_min: 20, created_at: '2026-09-01T12:00:00Z' }, // too old
    ]
    expect(weeklyMinutes(workouts, { weeks: 3, now })).toEqual([
      { weekStart: '2026-10-26', strength: 0, other: 0 },
      { weekStart: '2026-11-02', strength: 45, other: 0 },
      { weekStart: '2026-11-09', strength: 60, other: 30 },
    ])
  })
})

describe('describeTrend', () => {
  it('summarizes a rise from the first to the last session', () => {
    expect(describeTrend('Squat', [{ kg: 95 }, { kg: 100 }, { kg: 110 }])).toBe(
      'Squat: 95 kg → 110 kg over 3 sessions (+15 kg).',
    )
  })

  it('shows a drop with a minus sign', () => {
    expect(describeTrend('Squat', [{ kg: 100 }, { kg: 92.5 }])).toBe('Squat: 100 kg → 92.5 kg over 2 sessions (−7.5 kg).')
  })

  it('handles a single session', () => {
    expect(describeTrend('Squat', [{ kg: 110 }])).toBe('Squat: 110 kg in 1 session.')
  })
})

describe('describeWeek', () => {
  it('summarizes the current week', () => {
    expect(describeWeek({ strength: 60, other: 35 })).toBe('This week: 95 min (60 strength, 35 other).')
    expect(describeWeek({ strength: 0, other: 0 })).toBe('This week: no workouts yet.')
  })
})
