import { describe, expect, it } from 'vitest'
import { formatCalendarDay, formatDay } from './format'
import { toYmd } from './goals'
import { getRules, suggest } from './recommendations'

// Thursday, Nov 12, 2026, 18:30 local time.
const NOW = new Date(2026, 10, 12, 18, 30)
const at = (offset) => new Date(2026, 10, 12 + offset, 12).toISOString()
const day = (offset) => toYmd(new Date(2026, 10, 12 + offset))

/** `count` sets of `reps` at `kg`: [[reps, kg], …] */
const sets = (count, reps, kg) => Array.from({ length: count }, () => [reps, kg])

/** Workouts and sets as the API returns them (oldest first), no goals. */
function history(...sessions) {
  const workouts = []
  const rows = []
  for (const [index, { offset, type = 'strength', lifts = {} }] of sessions.entries()) {
    const id = `w${index + 1}`
    workouts.push({ id, type, duration_min: 45, created_at: at(offset) })
    for (const [exercise, list] of Object.entries(lifts)) {
      for (const [reps, weight_kg] of list) rows.push({ workout_id: id, exercise, reps, weight_kg, created_at: at(offset) })
    }
  }
  const byDate = (a, b) => new Date(a.created_at) - new Date(b.created_at)
  return { workouts: workouts.sort(byDate), sets: rows.sort(byDate), goals: [] }
}

const goal = (overrides = {}) => ({
  id: 'g1',
  exercise: 'Squat',
  target_kg: 120,
  target_date: day(49),
  created_at: at(-30),
  ...overrides,
})

describe('suggest: add 2.5 kg', () => {
  it('after the same sets at the same top weight in the last two sessions', () => {
    const data = history(
      { offset: -5, lifts: { Squat: [[5, 60], ...sets(3, 5, 100)] } },
      { offset: -2, lifts: { Squat: [[5, 60], ...sets(3, 5, 100)] } },
    )

    expect(suggest(data, NOW)).toEqual([
      {
        key: 'add:squat',
        kind: 'add',
        title: 'Squat: add 2.5 kg next time (102.5 kg).',
        because: 'You did 3 × 5 @ 100 kg in each of your last two sessions.',
      },
    ])
  })

  it('also when the last session beat the one before', () => {
    const data = history(
      { offset: -5, lifts: { Squat: sets(3, 5, 100) } },
      { offset: -2, lifts: { Squat: sets(3, 6, 100) } },
    )

    expect(suggest(data, NOW)).toMatchObject([
      { kind: 'add', because: 'You did 3 × 5 @ 100 kg, then 3 × 6 @ 100 kg.' },
    ])
  })

  it.each([
    ['a rep was missed', sets(3, 5, 100), [[5, 100], [5, 100], [4, 100]]],
    ['the weight just went up', sets(3, 5, 100), sets(3, 5, 102.5)],
    ['there were fewer sets', sets(3, 5, 100), sets(2, 5, 100)],
    ['it is bodyweight', sets(3, 8, 0), sets(3, 8, 0)],
  ])('not when %s', (_, before, last) => {
    const data = history({ offset: -5, lifts: { Squat: before } }, { offset: -2, lifts: { Squat: last } })

    expect(suggest(data, NOW)).toEqual([])
  })

  it('not after a single session', () => {
    expect(suggest(history({ offset: -2, lifts: { Squat: sets(3, 5, 100) } }), NOW)).toEqual([])
  })
})

describe('suggest: hold the weight', () => {
  it('when reps at the same top weight dropped two sessions in a row', () => {
    const data = history(
      { offset: -9, lifts: { 'Bench press': sets(3, 8, 80) } },
      { offset: -5, lifts: { 'Bench press': [[8, 80], [7, 80], [6, 80]] } },
      { offset: -1, lifts: { 'Bench press': [[7, 80], [6, 80], [5, 80]] } },
    )

    expect(suggest(data, NOW)).toEqual([
      {
        key: 'hold:bench press',
        kind: 'hold',
        title: 'Bench press: hold 80 kg or take a lighter week.',
        because: 'Your reps at 80 kg dropped two sessions in a row: 24 → 21 → 18.',
      },
    ])
  })

  it.each([
    ['they dropped only once', sets(3, 8, 80), [[8, 80], [7, 80], [6, 80]], [[8, 80], [7, 80], [6, 80]]],
    ['the weight changed', sets(3, 8, 80), sets(3, 7, 82.5), sets(3, 6, 82.5)],
  ])('not when %s', (_, first, second, third) => {
    const data = history(
      { offset: -9, lifts: { 'Bench press': first } },
      { offset: -5, lifts: { 'Bench press': second } },
      { offset: -1, lifts: { 'Bench press': third } },
    )

    expect(suggest(data, NOW)).toEqual([])
  })
})

describe('suggest: pick up where you left off', () => {
  it('after 7 days without a workout', () => {
    expect(suggest(history({ offset: -7, type: 'other' }), NOW)).toEqual([
      {
        key: 'back',
        kind: 'back',
        title: 'Pick up where you left off.',
        because: `Your last workout was 7 days ago (${formatDay(at(-7))}).`,
        link: '/log',
      },
    ])
  })

  it('not within 6 days', () => {
    expect(suggest(history({ offset: -6, type: 'other' }), NOW)).toEqual([])
  })
})

describe('suggest: goal pace', () => {
  it('when the kg to go per week left is more than the recent gain per week', () => {
    const data = {
      ...history({ offset: -24, lifts: { Squat: [[5, 108]] } }, { offset: -3, lifts: { Squat: [[5, 110]] } }),
      goals: [goal()],
    }

    expect(suggest(data, NOW)).toEqual([
      {
        key: 'pace:g1',
        kind: 'pace',
        title: `Squat 120 kg by ${formatCalendarDay(day(49))}: aim for +1.4 kg a week.`,
        because: '10 kg to go in 7 weeks; your sessions in the last 4 weeks gained +0.7 kg a week.',
      },
    ])
  })

  it("says so when the heaviest set hasn't gone up lately", () => {
    const data = {
      ...history({ offset: -40, lifts: { Squat: [[5, 100]] } }, { offset: -3, lifts: { Squat: [[5, 110]] } }),
      goals: [goal()],
    }

    expect(suggest(data, NOW)).toMatchObject([
      { kind: 'pace', because: "10 kg to go in 7 weeks; your heaviest set hasn't gone up in the last 4 weeks." },
    ])
  })

  it('spreads what is left over at least a week', () => {
    const data = { ...history({ offset: -3, lifts: { Squat: [[5, 110]] } }), goals: [goal({ target_date: day(3) })] }

    expect(suggest(data, NOW)).toMatchObject([
      {
        title: `Squat 120 kg by ${formatCalendarDay(day(3))}: aim for +10 kg a week.`,
        because: "10 kg to go in 3 days; your heaviest set hasn't gone up in the last 4 weeks.",
      },
    ])
  })

  it('not when the recent pace is enough, or the goal is reached or overdue', () => {
    const data = {
      ...history({ offset: -21, lifts: { Squat: [[5, 100]] } }, { offset: 0, lifts: { Squat: [[5, 110]] } }),
      goals: [
        goal({ id: 'on-pace' }),
        goal({ id: 'reached', target_kg: 105 }),
        goal({ id: 'overdue', target_kg: 150, target_date: day(-1) }),
      ],
    }

    expect(suggest(data, NOW)).toEqual([])
  })
})

describe('suggest: order', () => {
  it('lists picking up first, then holds, goal paces and weight increases', () => {
    const data = {
      ...history(
        { offset: -20, lifts: { 'Bench press': sets(3, 8, 80), Squat: sets(3, 5, 100) } },
        { offset: -14, lifts: { 'Bench press': [[8, 80], [7, 80], [6, 80]], Squat: sets(3, 5, 100) } },
        { offset: -8, lifts: { 'Bench press': [[7, 80], [6, 80], [5, 80]], Squat: sets(3, 5, 100) } },
      ),
      goals: [goal({ exercise: 'Deadlift', target_kg: 150, target_date: day(28) })],
    }

    expect(suggest(data, NOW).map((item) => item.key)).toEqual(['back', 'hold:bench press', 'pace:g1', 'add:squat'])
  })
})

describe('getRules', () => {
  it('explains every kind of suggestion, in the order they are listed', () => {
    expect(getRules().map((rule) => rule.kind)).toEqual(['back', 'hold', 'pace', 'add'])
    for (const rule of getRules()) expect(rule.text).toMatch(/^[A-Z].+\.$/)
  })
})
