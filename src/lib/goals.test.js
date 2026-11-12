import { describe, expect, it } from 'vitest'
import { formatCalendarDay, formatDay } from './format'
import { daysUntil, describeGoal, goalName, goalStatus, sortGoals, toYmd, validateGoal } from './goals'

// Thursday, Nov 12, 2026, 18:30 local time.
const NOW = new Date(2026, 10, 12, 18, 30)
/** Local noon `offset` days from NOW, as the API returns it. */
const at = (offset) => new Date(2026, 10, 12 + offset, 12).toISOString()
/** The local calendar date `offset` days from NOW: 'YYYY-MM-DD'. */
const day = (offset) => toYmd(new Date(2026, 10, 12 + offset))
const set = (exercise, weight_kg, offset) => ({
  workout_id: `w${offset}`,
  exercise,
  reps: 5,
  weight_kg,
  created_at: at(offset),
})
const goal = (overrides = {}) => ({
  id: 'g1',
  exercise: 'Squat',
  target_kg: 120,
  target_date: day(49),
  created_at: at(-1),
  ...overrides,
})
const SETS = [set('Squat', 100, -10), set('squat ', 110, -3), set('Bench press', 130, -2)]

describe('toYmd and daysUntil', () => {
  it('writes the local calendar date', () => {
    expect(toYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('counts whole calendar days from today, negative when past', () => {
    expect(daysUntil(day(0), NOW)).toBe(0)
    expect(daysUntil(day(49), NOW)).toBe(49)
    expect(daysUntil(day(-3), NOW)).toBe(-3)
  })
})

describe('validateGoal', () => {
  const ok = { exercise: 'Squat', targetKg: '120', targetDate: day(49) }

  it('accepts an exercise, a weight and a date from today on', () => {
    expect(validateGoal(ok, NOW)).toBe('')
    expect(validateGoal({ ...ok, targetKg: '102.5', targetDate: day(0) }, NOW)).toBe('')
  })

  it('asks for the exercise', () => {
    expect(validateGoal({ ...ok, exercise: '   ' }, NOW)).toBe('Enter the exercise.')
  })

  it.each(['', '0', '-5', '1000.5', 'abc'])('refuses %j as the target weight', (targetKg) => {
    expect(validateGoal({ ...ok, targetKg }, NOW)).toBe('Enter the target weight in kg: more than 0, up to 1000.')
  })

  it('asks for a date from today on', () => {
    expect(validateGoal({ ...ok, targetDate: '' }, NOW)).toBe('Pick the date to reach it by.')
    expect(validateGoal({ ...ok, targetDate: day(-1) }, NOW)).toBe('Pick today or a later date.')
  })
})

describe('goalStatus', () => {
  it('measures the heaviest set of that exercise, however it is spelled, against the target', () => {
    expect(goalStatus(goal(), SETS, NOW)).toEqual({
      best: 110,
      target: 120,
      remaining: 10,
      share: 110 / 120,
      daysLeft: 49,
      reachedOn: null,
      state: 'active',
    })
  })

  it('is reached from the first set at or over the target, even after the date', () => {
    const more = [...SETS, set('Squat', 120, -1), set('Squat', 125, 0)]

    expect(goalStatus(goal(), more, NOW)).toMatchObject({
      best: 125,
      remaining: 0,
      share: 1,
      reachedOn: at(-1),
      state: 'reached',
    })
    expect(goalStatus(goal({ target_date: day(-5) }), more, NOW).state).toBe('reached')
  })

  it('is overdue when the date passed first', () => {
    expect(goalStatus(goal({ target_date: day(-1) }), SETS, NOW)).toMatchObject({
      daysLeft: -1,
      remaining: 10,
      state: 'overdue',
    })
  })

  it('starts at zero before any set of that exercise', () => {
    expect(goalStatus(goal({ exercise: 'Deadlift' }), SETS, NOW)).toMatchObject({
      best: 0,
      remaining: 120,
      share: 0,
      state: 'active',
    })
  })
})

describe('describeGoal', () => {
  const line = (g, sets = SETS) => describeGoal(g, goalStatus(g, sets, NOW))

  it('says how much is left and how long', () => {
    expect(line(goal())).toBe('10 kg to go, 49 days left.')
    expect(line(goal({ target_date: day(1) }))).toBe('10 kg to go, 1 day left.')
    expect(line(goal({ target_date: day(0) }))).toBe('10 kg to go, due today.')
  })

  it('says when a goal was reached', () => {
    expect(line(goal(), [...SETS, set('Squat', 120, -1)])).toBe(`Reached on ${formatDay(at(-1))}.`)
  })

  it('says how far short an overdue goal is', () => {
    expect(line(goal({ target_date: day(-1) }))).toBe(`Was due ${formatCalendarDay(day(-1))}: 10 kg short.`)
  })
})

describe('goalName and sortGoals', () => {
  it('names a goal by exercise and weight', () => {
    expect(goalName({ exercise: ' Squat ', target_kg: 102.5 })).toBe('Squat 102.5 kg')
  })

  it('sorts goals by date, then by when they were added', () => {
    const goals = [
      goal({ id: 'late', target_date: day(60) }),
      goal({ id: 'second', target_date: day(10), created_at: at(-1) }),
      goal({ id: 'first', target_date: day(10), created_at: at(-2) }),
    ]

    expect(sortGoals(goals).map((g) => g.id)).toEqual(['first', 'second', 'late'])
  })
})
