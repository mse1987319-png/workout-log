'use strict'
// Set R: the demo walkthrough of the capstone deck (_task/results), desktop,
// 01-login.jpg ... 12-report-sent.jpg in _task/results/screenshots/{en,lt}/.
// 13 to 15 (Gmail) and evidence/ are screens of other products and are not made here.
//
// The images are 1510 x 812 px at scale 1 with the scrollbar the old ones show.
// Each language reproduces its own live run (worlds/demo.cjs): the Lithuanian demo
// logged "Kojų diena (demo)" at 18:45 and sent its report at 18:47; the English demo
// followed at 18:54 and 18:55 with its own numbers (Squat 110 kg, "Leg day (demo)").
// That is why the two languages differ in their data, as the slides say.

const path = require('path')
const { REPO } = require('../lib/harness.cjs')
const { planCard, cardOf, addExercise } = require('../lib/steps.cjs')

// What each demo did, and where the old picture was scrolled to (px from the top of the window).
const DEMO = {
  en: {
    start: '2026-11-12 18:52',
    saveAt: '2026-11-12 18:54',
    reportAt: '2026-11-12 18:55',
    title: 'Leg day (demo)',
    squatKg: 110,
    note: 'Squat +2.5 kg: every set was done last time.',
    titleLabelAt: 44, // 04: top edge of the Title label (its text sits 11 px lower)
    chartCardAt: 28, // 09: the "Heaviest set per session" card
    reportCardAt: { before: 393, after: 210 }, // 11, 12: the report card
  },
  lt: {
    start: '2026-11-12 18:44',
    saveAt: '2026-11-12 18:45',
    reportAt: '2026-11-12 18:47',
    title: 'Kojų diena (demo)',
    squatKg: 107.5,
    note: 'Pritūpimai +2,5 kg, kaip siūlė programa.',
    titleLabelAt: -4,
    chartCardAt: 24,
    reportCardAt: { before: 401, after: 210 },
  },
}

const scenes = [
  {
    // Step 1: the login screen, the demo athlete typed in (nothing is sent).
    name: 'demo-login',
    persona: null,
    now: '2026-11-12T16:50:00Z',
    images: ['01-login'],
    async run(s) {
      const { page, t } = s
      await page.getByLabel(t('login.email'), { exact: true }).fill('demo.athlete.a@example.com')
      await page.getByLabel(t('login.password'), { exact: true }).fill('demo-demo-demo-demo-') // shows as 20 dots
      await s.settle()
      await s.shot('01-login')
    },
  },

  {
    // Steps 2 to 10: one session of the demo athlete, as the presenter ran it.
    name: 'demo-athlete',
    persona: 'a',
    images: [
      '02-plans', '03-log-empty', '04-log-filled-top', '05-log-filled-bottom', '06-log-saved', '07-workout-detail',
      '08-progress-top', '09-progress-squat-chart', '10-progress-minutes-chart', '11-report-before', '12-report-sent',
    ],
    async run(s) {
      const { page, t, lang } = s
      const demo = DEMO[lang]
      await s.setNow(demo.start)

      // 2: My plans.
      await page.getByText("Martin's Plan").first().waitFor()
      await s.settle()
      await s.shot('02-plans')

      // 3: + Log workout on Strength 5 x 5: the plan is preselected.
      await planCard(s, 'Strength 5 × 5').getByRole('link', { name: t('plan.logLabel', { name: 'Strength 5 × 5' }) }).click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await page.locator('#workout-title').waitFor()
      await s.settle()
      await s.shot('03-log-empty')

      // 4: title, type, duration, Squat (5 sets) and its "Last time".
      await page.getByLabel(t('workout.titleLabel'), { exact: true }).fill(demo.title)
      await page.getByRole('radio', { name: t('type.strength'), exact: true }).check()
      await page.getByLabel(t('workout.duration'), { exact: true }).fill('55')
      await addExercise(s, 1, 'Squat', Array(5).fill([5, demo.squatKg]))
      await page.locator('.last-time').first().waitFor()

      // 5: Romanian deadlift (3 sets), a note, ready to save.
      await addExercise(s, 2, 'Romanian deadlift', Array(3).fill([8, 70]))
      await page.locator('.last-time').nth(1).waitFor()
      const notes = page.getByLabel(t('workout.notes'), { exact: true })
      await notes.fill(demo.note)

      await s.scrollTo('label[for="workout-title"]', demo.titleLabelAt)
      await s.shot('04-log-filled-top')
      await s.scrollToBottom()
      await s.calm()
      await notes.focus() // the picture shows the note being typed
      await s.shot('05-log-filled-bottom', { calm: false })

      // 6: saved.
      await s.setNow(demo.saveAt)
      await page.getByRole('button', { name: t('workout.submit'), exact: true }).click()
      await page.getByText(t('workout.saved', { title: demo.title })).waitFor()
      await page.evaluate(() => window.scrollTo(0, 0))
      await s.settle(300)
      await s.shot('06-log-saved')

      // 7: Open it.
      await page.getByRole('link', { name: t('workout.openIt') }).click()
      await page.getByRole('heading', { name: demo.title, level: 1 }).waitFor()
      await page.locator('.last-time').nth(1).waitFor()
      await s.settle()
      await s.shot('07-workout-detail')

      // 8: Progress, suggestions and the squat goal.
      await page.getByRole('link', { name: t('nav.progress'), exact: true }).click()
      await page.locator('#suggestions-title').waitFor()
      await s.settle(800)
      await s.shot('08-progress-top')

      // 9: the squat chart.
      const weight = cardOf(s, 'weight-title')
      await weight.getByLabel(t('common.exercise'), { exact: true }).selectOption('Squat')
      await s.settle(300)
      await s.scrollTo(weight, demo.chartCardAt)
      await s.shot('09-progress-squat-chart')

      // 10: minutes per week.
      await s.scrollToBottom()
      await s.shot('10-progress-minutes-chart')

      // 11: the report, before sending.
      const report = cardOf(s, 'report-title')
      await s.scrollTo(report, demo.reportCardAt.before)
      await s.shot('11-report-before')

      // 12: sent.
      await s.setNow(demo.reportAt)
      await report.getByRole('button', { name: t('report.send'), exact: true }).click()
      await page.getByText(t('report.sent')).waitFor()
      await s.settle(300)
      await s.scrollTo(report, demo.reportCardAt.after)
      await s.shot('12-report-sent')
    },
  },
]

module.exports = {
  id: 'R',
  name: 'results',
  world: 'demo',
  outDir: (lang) => path.join(REPO, '_task', 'results', 'screenshots', lang),
  format: 'jpeg',
  quality: 88,
  scrollbars: true,
  defaults: { viewport: { width: 1510, height: 812 }, scale: 1, now: '2026-11-12T16:52:00Z' },
  scenes,
}
