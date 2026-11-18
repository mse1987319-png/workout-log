'use strict'
// The made-up people of the user manuals (docs/user-manual), as they stood on
// 2026-11-12. Every number a manual screenshot shows can be checked here:
//
//   jonas   athlete with three plans and 21 workouts: his own "Upper / lower
//           split" and "Running base", and "Winter strength block", which his
//           instructor assigned. Squat 82.5 -> 102.5 kg in 8 sessions, a goal
//           of Squat 120 kg by Dec 24, a report sent on Nov 8.
//   mantas  a new athlete with no plans: the "first steps" screens.
//   coach   instructor with the code K7P2QX; jonas and ona share with him.
//   ona     athlete without a workout in the last 7 days.

const { createWorld, addUser, addPlan, addWorkout, addGoal, addReport, link, assign } = require('../lib/world.cjs')

// A strength day, written the way a person enters it: 2 sets a little lighter, then the top set.
const lowerBodyA = (squat, deadlift) => [
  ['Squat', 5, squat - 2.5],
  ['Squat', 5, squat - 2.5],
  ['Squat', 5, squat],
  ['Romanian deadlift', 8, deadlift],
  ['Romanian deadlift', 8, deadlift],
  ['Romanian deadlift', 8, deadlift],
]
const upperBodyA = (bench) => [
  ['Bench press', 5, bench - 2.5],
  ['Bench press', 5, bench - 2.5],
  ['Bench press', 4, bench],
  ['Pull-ups', 8, 0],
  ['Pull-ups', 8, 0],
  ['Pull-ups', 8, 0],
]

function build() {
  const world = createWorld()
  const jonas = addUser(world, { key: 'jonas', email: 'jonas@example.com', created: '2026-09-15 10:00' })
  const mantas = addUser(world, { key: 'mantas', email: 'mantas@example.com', created: '2026-11-12 09:00' })
  const ona = addUser(world, { key: 'ona', email: 'ona@example.com', created: '2026-10-10 10:00' })
  const coach = addUser(world, { key: 'coach', email: 'coach@example.com', role: 'instructor', inviteCode: 'K7P2QX', created: '2026-09-01 10:00' })

  // The instructor's plans (newest first on his My plans: Mobility basics, Winter strength block).
  const winter = addPlan(world, { owner: coach, name: 'Winter strength block', goal: 'Build a base before the spring season', created: '2026-11-02 08:00' })
  addPlan(world, { owner: coach, name: 'Mobility basics', goal: 'Ten minutes every day', created: '2026-11-05 08:00' })
  link(world, { instructor: coach, athlete: jonas, created: '2026-10-03 10:00' })
  link(world, { instructor: coach, athlete: ona, created: '2026-10-20 10:00' })
  assign(world, { instructor: coach, plan: winter, athlete: jonas, created: '2026-11-02 08:30' })

  // jonas: his own plans...
  const split = addPlan(world, { owner: jonas, name: 'Upper / lower split', goal: 'Get stronger before winter', created: '2026-09-20 09:00' })
  const running = addPlan(world, { owner: jonas, name: 'Running base', goal: 'Run 5 km without stopping', created: '2026-09-27 09:00' })

  // ...his strength days: Lower body A on Tuesdays (Sep 21 was a Monday), Upper body A at the weekend...
  const lower = [
    ['2026-09-21', 82.5, 50, split],
    ['2026-09-29', 87.5, 55, split],
    ['2026-10-06', 90, 57.5, split],
    ['2026-10-13', 92.5, 60, split],
    ['2026-10-20', 95, 62.5, split],
    ['2026-10-27', 97.5, 65, split],
    ['2026-11-03', 100, 67.5, split],
    ['2026-11-10', 102.5, 70, winter],
  ]
  for (const [day, squat, deadlift, plan] of lower) {
    addWorkout(world, { owner: jonas, plan, title: 'Lower body A', type: 'strength', minutes: 55, when: `${day} 18:05`, sets: lowerBodyA(squat, deadlift) })
  }
  const upper = [
    ['2026-09-26', 60, split],
    ['2026-10-10', 62.5, split],
    ['2026-10-17', 65, split],
    ['2026-10-24', 67.5, split],
    ['2026-10-31', 70, split],
    ['2026-11-07', 72.5, winter],
  ]
  for (const [day, bench, plan] of upper) {
    addWorkout(world, { owner: jonas, plan, title: 'Upper body A', type: 'strength', minutes: 50, when: `${day} 18:05`, sets: upperBodyA(bench) })
  }

  // ...and nine cardio workouts under Running base.
  const cardio = [
    ['2026-09-30 07:05', 'Easy run', 20, 'run', 3],
    ['2026-10-14 07:05', 'Easy run', 27, 'run', 4],
    ['2026-10-22 07:05', 'Easy run', 35, 'run', 5],
    ['2026-10-25 07:05', 'Long run', 67, 'run', 10],
    ['2026-10-28 07:05', 'Easy run', 28, 'run', 4],
    ['2026-11-01 18:05', 'Evening swim', 40, 'swim', 1.5],
    ['2026-11-04 07:05', 'Easy run', 33, 'run', 5],
    ['2026-11-08 07:05', 'Long run', 52, 'run', 8],
    ['2026-11-11 07:05', 'Easy run', 32, 'run', 5, 'Felt strong, easy pace.'],
  ]
  for (const [when, title, minutes, activity, km, notes] of cardio) {
    addWorkout(world, { owner: jonas, plan: running, title, type: 'other', minutes, when, activity, km, notes })
  }

  // Goals, in the order they were added (the instructor's page lists them so).
  addGoal(world, { owner: jonas, exercise: 'Squat', kg: 120, by: '2026-12-24', created: '2026-10-03 10:00' })
  addGoal(world, { owner: jonas, exercise: 'Bench press', kg: 80, by: '2026-12-31', created: '2026-10-03 10:05' })
  addGoal(world, { owner: jonas, exercise: 'Romanian deadlift', kg: 70, by: '2026-11-30', created: '2026-10-03 10:10' })

  addReport(world, {
    owner: jonas,
    when: '2026-11-08 20:30',
    summary: 'Nov 4 – Nov 10: 3 workouts (2 strength, 1 other), 139 min, 12 sets. Heaviest: Squat 100 kg, Bench press 70 kg. Distance: 8 km.',
  })

  // ona trained last on Nov 1.
  const ouroutine = addPlan(world, { owner: ona, name: 'Morning routine', goal: null, created: '2026-10-21 08:00' })
  addWorkout(world, { owner: ona, plan: ouroutine, title: 'Mobility', type: 'other', minutes: 20, when: '2026-11-01 08:00', activity: 'other' })

  return { world, personas: { jonas, mantas, coach, ona } }
}

module.exports = { build }
