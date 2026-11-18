'use strict'
// Set M: the screenshots of the user manuals (docs/user-manual/{en,lt}.md ->
// docs/user-manual/images/{en,lt}/). Same file names and pixel sizes as before:
// the runner refuses an image whose size differs from the file it replaces.
//
// Desktop images are 1100 x 800 CSS px at 1.5x (1650 x 1200 px); element
// pictures are 728 CSS px wide cards (1092 px). Phone images are 390 x 780 at 2x.
// Every scene starts from the same made-up world (worlds/manual.cjs) on
// 2026-11-12, 15:40 in Vilnius, so dates, "days left" and "this week" repeat.

const path = require('path')
const { REPO } = require('../lib/harness.cjs')

const PHONE = { viewport: { width: 390, height: 780 }, scale: 2 }

// ---- small helpers shared by the scenes ----

const planCard = (s, name) => s.page.locator('li.plan').filter({ has: s.page.getByRole('heading', { name, level: 2 }) })
const cardOf = (s, headingId) => s.page.locator(`section:has(> #${headingId})`)

/** Adds an exercise to the strength form: sets = [[reps, kg], ...]. */
async function addExercise(s, n, name, sets) {
  const { page, t } = s
  await page.getByRole('button', { name: t('exercises.addExercise') }).click()
  const nameBox = page.getByLabel(t('exercises.nameLabel', { n }), { exact: true })
  await nameBox.fill(name)
  await nameBox.blur() // the "Last time" hint is looked up on blur
  for (const [index, [reps, kg]] of sets.entries()) {
    const m = index + 1
    if (m > 1) await page.getByRole('button', { name: t('exercises.addSetLabel', { n }), exact: true }).click()
    await page.getByLabel(t('exercises.repsLabel', { n, m }), { exact: true }).fill(String(reps))
    await page.getByLabel(t('exercises.kgLabel', { n, m }), { exact: true }).fill(String(kg))
  }
}

/** Waits until the app has saved these screens' data on the "phone" (so offline has something to show). */
function savedOnPhone(s, keys) {
  return s.page.waitForFunction(
    (wanted) => wanted.every((key) => Object.keys(localStorage).some((k) => k.startsWith('logify.cache.v1.') && k.endsWith(`.${key}`))),
    keys,
    { timeout: 15000 },
  )
}

// ---- the scenes ----

const scenes = [
  {
    name: 'login',
    persona: null,
    images: ['01-login', '02-signup-athlete', '03-signup-instructor', '04-login-error'],
    async run(s) {
      const { page, t } = s
      await s.settle()
      await s.shot('01-login', { highlight: [{ target: '.lang-switch', pad: 4 }] })

      await page.locator('.switch-mode .link-button').click() // Create an account
      await page.getByRole('heading', { name: t('login.createAccount'), level: 1 }).waitFor()
      await s.shot('02-signup-athlete', { height: 831.34 })

      await page.getByRole('radio', { name: t('login.roleInstructor'), exact: true }).check()
      await s.shot('03-signup-instructor', { height: 831.34, highlight: [{ target: '.role-choice', pad: 3 }] })

      await page.locator('.switch-mode .link-button').click() // I already have an account
      await page.getByRole('heading', { name: t('login.logIn'), level: 1 }).waitFor()
      await page.getByLabel(t('login.email'), { exact: true }).fill('jonas@example.com')
      await page.getByLabel(t('login.password'), { exact: true }).fill('12345')
      await page.getByRole('button', { name: t('login.logIn'), exact: true }).click()
      await page.locator('.form-error').waitFor()
      await s.shot('04-login-error', { highlight: [{ target: '.form-error', padX: 3, padY: 2.3 }] })
    },
  },

  {
    // A new athlete: no plans, makes one, logs a strength and a cardio workout.
    name: 'first-steps',
    persona: 'mantas',
    images: ['10-plans-empty', '11-new-plan-form', '12-new-plan-created', '20-log-form-empty', '21-log-strength', '22-log-saved', '23-log-cardio'],
    async run(s) {
      const { page, t } = s
      await page.locator('.state-empty').waitFor()
      await s.settle()
      await s.shot('10-plans-empty', { height: 460, highlight: [{ target: '.page-head .button', pad: 3 }] })

      await page.locator('.page-head .button').click() // New plan
      await page.getByLabel(t('plan.nameLabel'), { exact: true }).fill('Upper / lower split')
      await page.getByLabel(t('plan.goalLabel'), { exact: true }).fill('Squat 100 kg by Christmas')
      await s.shot('11-new-plan-form', { height: 560 })

      await page.getByRole('button', { name: t('plan.createPlan'), exact: true }).click()
      const logUnder = page.getByRole('link', { name: t('newPlan.logUnder') })
      await logUnder.waitFor()
      await s.shot('12-new-plan-created', { height: 640, highlight: [{ target: logUnder, pad: 3 }] })

      await logUnder.click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await page.locator('#workout-title').waitFor()
      await s.settle()
      await s.shot('20-log-form-empty', { height: 'page' })

      await page.getByLabel(t('workout.titleLabel'), { exact: true }).fill('Lower body A')
      await page.getByRole('radio', { name: t('type.strength'), exact: true }).check()
      await page.getByLabel(t('workout.duration'), { exact: true }).fill('55')
      await addExercise(s, 1, 'Squat', [[5, 100], [5, 102.5]])
      await page.getByText(t('lastTime.first', { name: 'Squat' })).waitFor()
      await addExercise(s, 2, 'Pull-ups', [[8, 0]])
      await page.getByText(t('lastTime.first', { name: 'Pull-ups' })).waitFor()
      await page.getByLabel(t('workout.notes'), { exact: true }).fill('Felt strong today.')
      await s.shot('21-log-strength', { height: 'page', highlight: [{ target: '.exercises', pad: 3 }] })

      await page.getByRole('button', { name: t('workout.submit'), exact: true }).click()
      await page.getByText(t('workout.saved', { title: 'Lower body A' })).waitFor()
      await s.shot('22-log-saved', { height: 'page' })

      await page.getByLabel(t('workout.titleLabel'), { exact: true }).fill('Morning jog')
      await page.getByRole('radio', { name: t('workout.typeOtherLong'), exact: true }).check()
      await page.getByLabel(t('workout.duration'), { exact: true }).fill('30')
      await page.getByLabel(t('workout.activity'), { exact: true }).selectOption('run')
      await page.getByLabel(t('workout.distance'), { exact: true }).fill('4.5')
      await page.getByLabel(t('workout.notes'), { exact: true }).fill('Easy pace.')
      await s.shot('23-log-cardio', { height: 'page', highlight: [{ target: '.field-row', pad: 3 }] })
    },
  },

  {
    // The same new athlete shares with an instructor by code.
    name: 'sharing-first-time',
    persona: 'mantas',
    path: '/sharing',
    images: ['30-sharing-empty', '31-sharing-code', '32-sharing-linked'],
    async run(s) {
      const { page, t } = s
      await page.getByText(t('sharing.none')).waitFor()
      await s.settle()
      await s.shot('30-sharing-empty')

      const code = page.getByLabel(t('sharing.codeLabel'), { exact: true })
      await code.fill('K7P2QX')
      await s.shot('31-sharing-code', { highlight: [{ target: code, pad: 3 }] })

      await page.getByRole('button', { name: t('sharing.share'), exact: true }).click()
      await page.getByText(t('sharing.nowShare', { email: 'coach@example.com' })).waitFor()
      await s.shot('32-sharing-linked')
    },
  },

  {
    // jonas, My plans: the menu, an assigned plan, the plan's buttons, edit, delete, rename a workout.
    name: 'athlete-plans',
    persona: 'jonas',
    images: ['40-plans', '41-assigned-plan', '42-plan-actions', '43-plan-edit', '44-plan-delete', '45-rename-link', '46-rename', '47-renamed'],
    async run(s) {
      const { page, t } = s
      await page.getByText('Winter strength block').first().waitFor()
      await s.settle()
      await s.shot('40-plans', { height: 760, highlight: [{ target: '.nav', pad: 3 }] })
      await s.shot('41-assigned-plan', { element: planCard(s, 'Winter strength block') })

      const running = page.locator('li.plan').nth(1) // Running base; while it is edited it has no heading to find it by
      await s.shot('42-plan-actions', {
        element: running.locator('.plan-head'),
        highlight: [{ target: running.locator('.plan-actions a'), pad: 3 }],
      })

      await running.locator('.plan-actions').getByRole('button', { name: t('plan.editLabel', { name: 'Running base' }) }).click()
      await s.shot('43-plan-edit', { element: running })
      await running.getByRole('button', { name: t('common.cancel'), exact: true }).click()

      await running.locator('.plan-actions').getByRole('button', { name: t('plan.deleteLabel', { name: 'Running base' }) }).click()
      const confirm = running.getByRole('button', { name: t('plan.confirmYes') })
      await confirm.waitFor()
      await s.shot('44-plan-delete', { element: running, height: 380, highlight: [{ target: confirm, pad: 3 }] })
      await running.getByRole('button', { name: t('common.cancel'), exact: true }).click()

      const split = page.locator('li.plan').nth(2) // Upper / lower split
      const lower = split.locator('li.workout').first() // Lower body A, Nov 3
      await s.shot('45-rename-link', { element: lower, highlight: [{ target: lower.locator('.link-button'), pad: 3 }] })
      await lower.locator('.link-button').click()
      await lower.locator('.rename-form input').fill('Lower body A (heavy)')
      await s.shot('46-rename', { element: lower })
      await lower.getByRole('button', { name: t('common.save'), exact: true }).click()
      await lower.getByText(t('workout.titleUpdated')).waitFor()
      await s.shot('47-renamed', { element: lower })
    },
  },

  {
    // jonas opens two workouts from My plans.
    name: 'athlete-details',
    persona: 'jonas',
    images: ['50-detail-strength', '51-detail-cardio'],
    async run(s) {
      const { page, t } = s
      await page.getByText('Winter strength block').first().waitFor()
      // Upper / lower split lists Lower body A (Nov 3) first, then Upper body A (Oct 31).
      await planCard(s, 'Upper / lower split').locator('li.workout').nth(1).getByRole('link').click()
      await page.getByRole('heading', { name: 'Upper body A', level: 1 }).waitFor()
      await page.locator('.last-time').nth(1).waitFor() // "Last time" under both exercises
      await s.settle()
      await s.shot('50-detail-strength', { height: 'page' })

      await page.getByRole('link', { name: t('detail.back') }).click()
      await planCard(s, 'Running base').locator('li.workout').first().getByRole('link').click() // Easy run, Nov 11
      await page.getByRole('heading', { name: 'Easy run', level: 1 }).waitFor()
      await s.settle()
      await s.shot('51-detail-cardio')
    },
  },

  {
    // jonas, Progress, card by card.
    name: 'athlete-progress',
    persona: 'jonas',
    path: '/progress',
    images: [
      '60-progress-suggestions', '61-progress-goals', '62-goal-form', '63-goal-added', '64-report',
      '65-report-sent', '66-weight-chart', '67-weight-table', '68-minutes-chart',
    ],
    async run(s) {
      const { page, t } = s
      await page.locator('#suggestions-title').waitFor()
      await s.settle(800)
      await s.shot('60-progress-suggestions', { element: cardOf(s, 'suggestions-title') })

      const goals = cardOf(s, 'goals-title')
      await s.shot('61-progress-goals', { element: goals })

      await page.getByLabel(t('common.exercise'), { exact: true }).first().fill('Bench press')
      await page.getByLabel(t('goals.targetKg'), { exact: true }).fill('85')
      await page.getByLabel(t('goals.reachBy'), { exact: true }).fill('2027-02-10')
      await s.shot('62-goal-form', { element: goals, highlight: [{ target: '.goal-form', pad: 3 }] })
      await page.getByRole('button', { name: t('goals.add'), exact: true }).click()
      await goals.locator('.state-success').waitFor()
      await s.shot('63-goal-added', { element: goals })

      const report = cardOf(s, 'report-title')
      await s.shot('64-report', { element: report, highlight: [{ target: report.getByRole('button'), pad: 3 }] })
      await report.getByRole('button', { name: t('report.send'), exact: true }).click()
      await page.getByText(t('report.sent')).waitFor()
      await s.shot('65-report-sent', { element: report })

      const weight = cardOf(s, 'weight-title')
      await weight.getByLabel(t('common.exercise'), { exact: true }).selectOption('Squat')
      await s.settle(300)
      await s.shot('66-weight-chart', { element: weight })
      await weight.locator('summary').click()
      await s.shot('67-weight-table', { element: weight })

      await s.shot('68-minutes-chart', { element: cardOf(s, 'minutes-title') })
    },
  },

  {
    name: 'athlete-sharing',
    persona: 'jonas',
    path: '/sharing',
    images: ['70-sharing'],
    async run(s) {
      const { page, t } = s
      await page.getByText('coach@example.com').waitFor()
      await s.settle()
      await s.shot('70-sharing', {
        highlight: [{ target: page.getByRole('button', { name: t('sharing.stopLabel', { email: 'coach@example.com' }) }), pad: 3 }],
      })
    },
  },

  {
    // The phone layout (bottom bar). 80 and 81 were retaken for v5 earlier; now from this tool.
    name: 'phone-basics',
    persona: 'jonas',
    ...PHONE,
    images: ['80-phone-plans', '81-phone-log'],
    async run(s) {
      const { page, t } = s
      await page.getByText('Winter strength block').first().waitFor()
      await s.settle(1000)
      await s.shot('80-phone-plans')

      await page.getByRole('link', { name: t('nav.log'), exact: true }).click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await page.getByRole('radio', { name: t('type.strength'), exact: true }).check()
      await s.settle(1000)
      await s.shot('81-phone-log')
    },
  },

  {
    // Android Chrome offers to install the app: the card on My plans shows Install and Not now.
    name: 'phone-install',
    persona: 'jonas',
    ...PHONE,
    images: ['82-phone-install'],
    async run(s) {
      const { page } = s
      await page.getByText('Winter strength block').first().waitFor()
      await s.settle(800)
      await s.offerInstall()
      await page.locator('.install-card').waitFor()
      await s.settle(500)
      await s.shot('82-phone-install', { size: [780, 1560] })
    },
  },

  {
    // No signal. The app was opened with a connection first (it saves what it loaded), then the phone goes offline.
    // The screens are reached through the tab bar, so nothing is reloaded: there is no service worker under `npm run dev`.
    name: 'phone-offline',
    persona: 'jonas',
    ...PHONE,
    images: ['83-phone-offline', '84-phone-saved-on-phone', '85-phone-waiting'],
    async run(s) {
      const { page, t } = s
      const tab = (key) => page.getByRole('link', { name: t(key), exact: true })
      await page.getByText('Winter strength block').first().waitFor()
      await s.settle(800)
      await savedOnPhone(s, ['plans', 'planOptions', 'progress'])
      await s.goOffline()
      await page.locator('.status-bar').waitFor()

      // My plans again, now from the saved copy.
      await tab('nav.log').click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await tab('nav.myPlans').click()
      await page.locator('.state-saved').waitFor()
      await s.settle(500)
      await s.shot('83-phone-offline', { size: [780, 1560] })

      // Log a workout and press Save without signal.
      await tab('nav.log').click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await page.getByLabel(t('workout.titleLabel'), { exact: true }).fill('Upper body A')
      await page.getByRole('radio', { name: t('type.strength'), exact: true }).check()
      await page.getByLabel(t('workout.duration'), { exact: true }).fill('50')
      await addExercise(s, 1, 'Bench press', [[5, 72.5]])
      await page.locator('.last-time').first().waitFor() // "Last time" comes from the saved progress
      await page.getByRole('button', { name: t('workout.submit'), exact: true }).click()
      const kept = page.locator('.state-success')
      await kept.waitFor()
      await kept.evaluate((element) => element.scrollIntoView({ block: 'center' }))
      await s.settle(300)
      await s.shot('84-phone-saved-on-phone', { size: [780, 1560] })

      // The workout waits under its plan.
      await kept.getByRole('link', { name: t('workout.seeInPlans') }).click()
      await page.locator('.workout-waiting').waitFor()
      await s.settle(500)
      await s.shot('85-phone-waiting', { size: [780, 1560] })
    },
  },

  {
    // An instructor's phone: the bottom bar has My athletes instead of Sharing.
    name: 'phone-instructor',
    persona: 'coach',
    path: '/athletes',
    ...PHONE,
    images: ['111-phone-athletes'],
    async run(s) {
      const { page } = s
      await page.getByText('jonas@example.com').waitFor()
      await s.settle(800)
      await s.shot('111-phone-athletes', { size: [780, 1560] })
    },
  },

  {
    // The instructor: plans, code, an athlete's page, assigning a plan.
    name: 'instructor',
    persona: 'coach',
    images: [
      '110-coach-plans', '100-athletes', '101-athlete-top', '102-assign', '103-assigned',
      '104-athlete-suggestions', '105-athlete-goals', '106-athlete-recent', '107-athlete-reports', '108-athlete-charts',
    ],
    async run(s) {
      const { page, t } = s
      await page.getByText('Mobility basics').first().waitFor()
      await s.settle()
      await s.shot('110-coach-plans', { height: 520, highlight: [{ target: '.page-head .button', pad: 3 }] })

      await page.getByRole('link', { name: t('nav.myAthletes'), exact: true }).click()
      await page.getByText('jonas@example.com').waitFor()
      await s.settle()
      await s.shot('100-athletes', { highlight: [{ target: '.invite-code', pad: 3 }] })

      await page.getByRole('link', { name: 'jonas@example.com' }).click()
      await page.getByRole('heading', { name: 'jonas@example.com', level: 1 }).waitFor()
      await page.locator('#suggestions-title').waitFor()
      await s.settle(800)
      await s.shot('101-athlete-top', { height: 620 })

      const assigned = cardOf(s, 'assigned-title')
      await s.shot('102-assign', { element: assigned, highlight: [{ target: '.assign-form', pad: 3 }] })
      await assigned.getByRole('button', { name: t('athlete.assign'), exact: true }).click()
      await page.getByText(t('athlete.assigned', { name: 'Mobility basics' })).waitFor()
      await s.shot('103-assigned', { element: assigned })

      await s.shot('104-athlete-suggestions', { element: cardOf(s, 'suggestions-title') })
      await s.shot('105-athlete-goals', { element: cardOf(s, 'goals-title') })
      await s.shot('106-athlete-recent', { element: cardOf(s, 'recent-title') })
      await s.shot('107-athlete-reports', { element: cardOf(s, 'reports-title') })
      await s.shot('108-athlete-charts', { element: cardOf(s, 'weight-title') })
    },
  },
]

module.exports = {
  id: 'M',
  name: 'manual',
  world: 'manual',
  outDir: (lang) => path.join(REPO, 'docs', 'user-manual', 'images', lang),
  defaults: { viewport: { width: 1100, height: 800 }, scale: 1.5, now: '2026-11-12T13:40:00Z' },
  scenes,
}
