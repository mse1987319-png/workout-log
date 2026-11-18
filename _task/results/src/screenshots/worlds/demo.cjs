'use strict'
// The capstone deck's demo (Set R, the desktop walkthrough, and Set P, the phone
// appendix): the live project as it stood on 2026-11-12, made of
//
//   1. supabase/seed.sql: demo.athlete.a (8 weeks of a leg day, an upper-body day and a
//      run, a squat goal), demo.athlete.b (a beginner, nothing logged for 8 days) and
//      the instructor demo.instructor (code GYM234, both athletes share with them).
//      The seed ran on 2026-11-12, so "days ago" below count from that day (UTC, as the
//      database counts them).
//   2. What was done on the live site that morning and afternoon, before the demos:
//      the shared instructor with a real inbox (mse1987319+logify@gmail.com) was linked
//      to athlete A under Sharing and assigned "Martin's Plan"; athlete A ran for 60 min
//      at 17:23 and sent a report.
//   3. The Lithuanian demo (18:45 workout "Kojų diena (demo)", 18:47 report). The English
//      demo ran after it, so its screenshots show those two rows (the old English images
//      do: "Last time (Nov 12): 5 × 5 @ 107.5 kg"). The Lithuanian images were taken
//      before, so for them the world stops at 2.
//
// Every number on the deck's slides can be checked from this file: the squat chart
// (90 kg on Sep 21, 105 kg twice, 107.5 and 110 kg on Nov 12), "254 minutes this week"
// (165 strength: Nov 9 and the two demo workouts; 89 other: the runs of Nov 11 and 17:23)
// and the report "6 workouts (4 strength, 2 other), 304 min, 33 sets".
//
// build({ lang, afterLtDemo, martinsPlan }):
//   afterLtDemo  the world includes step 3; default true for 'en', false for 'lt'
//   martinsPlan  the world includes the live-test leftovers of step 2 ("Martin's Plan" and the
//                60 min run and report of 17:23); default true. The phone appendix leaves them out:
//                they are one person's test data, and without them the plan a workout is logged under
//                is the first card on My plans, so a "Waiting to send" row fits on the phone's screen.

const { createWorld, addUser, addPlan, addWorkout, addGoal, addReport, link, assign } = require('../lib/world.cjs')

const DAY = 24 * 3600 * 1000
const SEED_DAY = Date.UTC(2026, 10, 12) // the seed's date_trunc('day', now())

/** The database's own clock: `days` before the seed day at `hour` o'clock UTC (what seed_workout does). */
const daysAgo = (days, hour) => new Date(SEED_DAY - days * DAY + hour * 3600 * 1000).toISOString()

/**
 * The seed's way of writing sets: 'Squat 3x5@100; Bench press 8,7,6@60; Push-up 3x12@0'
 * -> [['Squat', 5, 100], ['Squat', 5, 100], ['Squat', 5, 100], ['Bench press', 8, 60], ...].
 */
function parseSets(text) {
  const sets = []
  for (const item of text.split(';').map((part) => part.trim()).filter(Boolean)) {
    const counted = item.match(/^(.+?)\s+(\d+)x(\d+)@([0-9.]+)$/)
    if (counted) {
      for (let k = 0; k < Number(counted[2]); k += 1) sets.push([counted[1], Number(counted[3]), Number(counted[4])])
      continue
    }
    const listed = item.match(/^(.+?)\s+([0-9,]+)@([0-9.]+)$/)
    if (!listed) throw new Error(`cannot read the sets "${item}"`)
    for (const reps of listed[2].split(',')) sets.push([listed[1], Number(reps), Number(listed[3])])
  }
  return sets
}

// Athlete A, week by week, oldest first (seed.sql).
const SQUAT = ['3x5@90', '3x5@92.5', '3x5@95', '3x5@97.5', '3x5@100', '3x5@102.5', '5x5@105', '5x5@105']
const RDL = [50, 52.5, 55, 57.5, 60, 62.5, 65, 67.5]
const BENCH = ['3x8@50', '3x8@52.5', '3x8@55', '3x8@57.5', '3x8@57.5', '3x8@60', '8,7,6@60', '7,6,5@60']
const ROW = [40, 42.5, 42.5, 45, 45, 47.5, 47.5, 50]
const PRESS = [30, 30, 32.5, 32.5, 35, 35, 35, 37.5]
const RUN_TITLE = ['Easy run', 'Easy run', 'Intervals 6 × 400 m', 'Easy run', '5 km time trial', 'Easy run', 'Easy run', 'Easy run']
const RUN_MIN = [27, 29, 35, 32, 30, 31, 33, 29]
const RUN_KM = [4, 4.5, 5, 5, 5, 5, 5.5, 5]
const RUN_NOTES = [null, null, null, null, 'New best: 30:05.', null, null, 'Felt easy.']

function build({ lang = 'en', afterLtDemo = lang === 'en', martinsPlan = true } = {}) {
  const world = createWorld()

  // ---- people ----
  const a = addUser(world, { key: 'a', email: 'demo.athlete.a@example.com', created: '2026-09-13 10:00' })
  const b = addUser(world, { key: 'b', email: 'demo.athlete.b@example.com', created: '2026-09-13 10:00' })
  const coach = addUser(world, { key: 'coach', email: 'demo.instructor@example.com', role: 'instructor', inviteCode: 'GYM234', created: '2026-09-13 10:00' })
  // The instructor with a real inbox: Zapier's emails about athlete A arrive there.
  const shared = addUser(world, { key: 'shared', email: 'mse1987319+logify@gmail.com', role: 'instructor', inviteCode: 'DEMO42', created: '2026-11-12 16:00' })

  // ---- plans (the seed's) ----
  const strengthBlock = addPlan(world, { owner: a, name: 'Strength block', goal: 'Squat 120 kg this winter', created: '2026-09-16 12:01' })
  const fiveK = addPlan(world, { owner: a, name: '5K plan', goal: 'Run 5 km under 30 min', created: '2026-09-16 12:00' })
  const beginner = addPlan(world, { owner: b, name: 'Beginner strength', goal: 'Train three times a week', created: '2026-10-05 12:00' })
  const cardio = addPlan(world, { owner: b, name: 'Mobility and cardio', goal: 'Move every day', created: '2026-10-05 12:01' })
  // The three instructor plans were created in one transaction; their minutes keep the order My plans listed them in.
  const full = addPlan(world, { owner: coach, name: 'Full body for beginners', goal: 'Three full-body sessions a week: 3 × 10, then add weight', created: '2026-10-13 12:01' })
  const running = addPlan(world, { owner: coach, name: 'Running base', goal: 'Three easy runs a week, 25–40 minutes', created: '2026-10-13 12:00' })
  const fiveByFive = addPlan(world, {
    owner: coach,
    name: 'Strength 5 × 5',
    goal: 'Squat, bench and row, 5 × 5, three times a week; add 2.5 kg when every set is done',
    created: '2026-10-13 12:02',
  })

  // ---- sharing and assigned plans (the seed's) ----
  link(world, { instructor: coach, athlete: a, created: '2026-10-22 10:00' })
  link(world, { instructor: coach, athlete: b, created: '2026-10-29 10:00' })
  assign(world, { instructor: coach, plan: fiveByFive, athlete: a, created: '2026-10-23 10:00' })
  assign(world, { instructor: coach, plan: running, athlete: a, created: '2026-10-23 10:00' })
  assign(world, { instructor: coach, plan: full, athlete: b, created: '2026-10-30 10:00' })
  assign(world, { instructor: coach, plan: running, athlete: b, created: '2026-10-30 10:00' })

  // ---- athlete A: 8 weeks (seed.sql, "for week in reverse 7..0") ----
  for (let week = 7; week >= 0; week -= 1) {
    const i = 7 - week // index into the week arrays
    addWorkout(world, {
      owner: a,
      plan: week <= 2 ? running : fiveK,
      title: RUN_TITLE[i],
      type: 'other',
      minutes: RUN_MIN[i],
      when: daysAgo(week * 7 + 1, 7),
      activity: 'run',
      km: RUN_KM[i],
      notes: RUN_NOTES[i],
    })
    addWorkout(world, {
      owner: a,
      plan: week <= 1 ? fiveByFive : strengthBlock,
      title: 'Leg day',
      type: 'strength',
      minutes: 55,
      when: daysAgo(week * 7 + 3, 18),
      sets: parseSets(`Squat ${SQUAT[i]}; Romanian deadlift 3x8@${RDL[i]}`),
    })
    addWorkout(world, {
      owner: a,
      plan: strengthBlock,
      title: 'Upper body',
      type: 'strength',
      minutes: 50,
      when: daysAgo(week * 7 + 5, 18),
      sets: parseSets(`Bench press ${BENCH[i]}; Barbell row 3x8@${ROW[i]}; Overhead press 3x8@${PRESS[i]}`),
    })
  }
  addGoal(world, { owner: a, exercise: 'Squat', kg: 120, by: '2026-12-24', created: '2026-10-23 10:00' })

  // ---- athlete B: a beginner, nothing logged for the last 8 days (seed.sql) ----
  const bWorkouts = [
    // days ago, hour, plan, title, type, minutes, sets or { activity, km }, notes
    [36, 17, beginner, 'Full body A', 'strength', 40, 'Goblet squat 3x10@16; Dumbbell row 3x10@10; Push-up 3x8@0'],
    [34, 8, cardio, 'Bike ride', 'other', 35, { activity: 'bike', km: 12 }],
    [33, 17, beginner, 'Full body B', 'strength', 40, 'Deadlift 3x5@50; Dead bug 3x10@0; Push-up 3x8@0'],
    [31, 7, cardio, 'Morning mobility flow', 'other', 20, { activity: 'other' }],
    [29, 17, beginner, 'Full body A', 'strength', 45, 'Goblet squat 3x10@18; Dumbbell row 3x10@12; Push-up 3x10@0'],
    [26, 17, beginner, 'Full body B', 'strength', 45, 'Deadlift 3x5@55; Hanging knee raise 3x8@0; Push-up 3x10@0'],
    [24, 8, cardio, 'Bike ride', 'other', 40, { activity: 'bike', km: 15 }],
    [22, 17, beginner, 'Full body A', 'strength', 45, 'Goblet squat 3x10@20; Dumbbell row 3x10@12; Push-up 3x12@0'],
    [19, 17, beginner, 'Full body B', 'strength', 45, 'Deadlift 3x5@60; Dead bug 3x10@0; Push-up 3x12@0'],
    [17, 7, cardio, 'Morning mobility flow', 'other', 20, { activity: 'other' }],
    [11, 17, full, 'Full body A', 'strength', 45, 'Goblet squat 3x10@22; Dumbbell row 3x10@14; Push-up 3x12@0'],
    [10, 7, running, 'Easy run', 'other', 22, { activity: 'run', km: 3 }],
    [8, 17, full, 'Full body B', 'strength', 45, 'Deadlift 3x5@60; Hanging knee raise 3x10@0; Push-up 3x15@0', 'Back a bit sore; taking it easy.'],
  ]
  for (const [days, hour, plan, title, type, minutes, what, notes] of bWorkouts) {
    const extra = typeof what === 'string' ? { sets: parseSets(what) } : { activity: what.activity, km: what.km ?? null }
    addWorkout(world, { owner: b, plan, title, type, minutes, when: daysAgo(days, hour), notes: notes ?? null, ...extra })
  }
  addGoal(world, { owner: b, exercise: 'Deadlift', kg: 80, by: '2027-01-07', created: '2026-10-31 10:00' })

  // The seed's own report (send_report() right after seeding).
  addReport(world, {
    owner: a,
    when: '2026-11-12 10:00',
    summary: 'Nov 6 – Nov 12: 3 workouts (2 strength, 1 other), 134 min, 17 sets. Heaviest: Squat 105 kg, Romanian deadlift 67.5 kg, Bench press 60 kg. Distance: 5 km.',
  })

  // ---- the live site, before the demos ----
  // The shared instructor with a real inbox is linked to A under Sharing.
  link(world, { instructor: shared, athlete: a, created: '2026-11-12 17:12' })
  if (martinsPlan) {
    // "Martin's Plan", made by the shared instructor and assigned to A; A ran under it, then sent a report.
    const martins = addPlan(world, { owner: shared, name: "Martin's Plan", goal: "Martin's Goal", created: '2026-11-12 17:10' })
    assign(world, { instructor: shared, plan: martins, athlete: a, created: '2026-11-12 17:15' })
    addWorkout(world, { owner: a, plan: martins, title: 'Running', type: 'other', minutes: 60, when: '2026-11-12 17:23', activity: 'run', km: 10 })
    addReport(world, {
      owner: a,
      when: '2026-11-12 17:23',
      summary: 'Nov 6 – Nov 12: 4 workouts (2 strength, 2 other), 194 min, 17 sets. Heaviest: Squat 105 kg, Romanian deadlift 67.5 kg, Bench press 60 kg. Distance: 15 km.',
    })
  }

  // ---- the Lithuanian demo (it ran first) ----
  if (afterLtDemo) {
    addWorkout(world, {
      owner: a,
      plan: fiveByFive,
      title: 'Kojų diena (demo)',
      type: 'strength',
      minutes: 55,
      when: '2026-11-12 18:45',
      notes: 'Pritūpimai +2,5 kg, kaip siūlė programa.',
      sets: parseSets('Squat 5x5@107.5; Romanian deadlift 3x8@70'),
    })
    addReport(world, {
      owner: a,
      when: '2026-11-12 18:47',
      summary: 'Nov 6 – Nov 12: 5 workouts (3 strength, 2 other), 249 min, 25 sets. Heaviest: Squat 107.5 kg, Romanian deadlift 70 kg, Bench press 60 kg. Distance: 15 km.',
    })
  }

  return { world, personas: { a, b, coach, shared } }
}

module.exports = { build }
