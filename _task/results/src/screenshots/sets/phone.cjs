'use strict'
// Set P: the phone screenshots of the capstone deck's Appendix C (_task/results),
// p01-install.jpg ... p12-instructor.jpg in _task/results/screenshots/{en,lt}/phone/.
//
// 390 x 780 CSS px at 2x (780 x 1560 px), JPEG. Everything is the demo athlete
// (worlds/demo.cjs) on 2026-11-12 at 18:50, with the Lithuanian demo's workout and report
// already there (as the English demo found them), so "Last time" is Squat 107.5 kg and the
// workout logged here is the deck's Squat 5 x 5 @ 110 kg. The live-test leftovers of that day
// ("Martin's Plan", see worlds/demo.cjs) are left out. The scenes that go offline reach their
// screens through the tab bar: `npm run dev` has no service worker (see README.md).

const path = require('path')
const { REPO } = require('../lib/harness.cjs')
const { addExercise, savedOnPhone } = require('../lib/steps.cjs')

const SIZE = [780, 1560]
const WORKOUT_TITLE = 'Leg day (demo)'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A picture of what is on the phone's screen now. */
const shot = (s, name, options) => s.shot(name, { size: SIZE, ...options })

const tab = (s, key) => s.page.getByRole('link', { name: s.t(key), exact: true })

/** My plans has loaded and shows the demo athlete's plans. */
async function plansLoaded(s) {
  await s.page.getByText('Strength 5 × 5').first().waitFor()
  await s.settle(800)
}

/** The Log workout form as the demo fills it: Strength 5 x 5 plan, title, type, 55 min; `exercises` adds Squat and Romanian deadlift. */
async function fillWorkout(s, { exercises = true } = {}) {
  const { page, t } = s
  await page.getByLabel(t('workout.plan'), { exact: true }).selectOption({ label: 'Strength 5 × 5' })
  await page.getByLabel(t('workout.titleLabel'), { exact: true }).fill(WORKOUT_TITLE)
  await page.getByRole('radio', { name: t('type.strength'), exact: true }).check()
  await page.getByLabel(t('workout.duration'), { exact: true }).fill('55')
  if (!exercises) return
  await addExercise(s, 1, 'Squat', Array(5).fill([5, 110]))
  await page.locator('.last-time').first().waitFor() // "Last time" is looked up on blur
  await addExercise(s, 2, 'Romanian deadlift', Array(3).fill([8, 70]))
  await page.locator('.last-time').nth(1).waitFor()
}

const scenes = [
  {
    // Android Chrome offers to install the app: Install and Not now.
    name: 'phone-install',
    persona: 'a',
    images: ['p01-install'],
    async run(s) {
      await plansLoaded(s)
      await s.offerInstall()
      await s.page.locator('.install-card').waitFor()
      await s.settle(500)
      await shot(s, 'p01-install')
    },
  },

  {
    // iPhone Safari has no install button: the card says Share, then Add to Home Screen.
    name: 'phone-ios-install',
    persona: 'a',
    userAgent: IPHONE,
    images: ['p02-ios-install'],
    async run(s) {
      await plansLoaded(s)
      await s.page.locator('.install-card').waitFor()
      await s.settle(500)
      await shot(s, 'p02-ios-install')
    },
  },

  {
    // The bottom tab bar: My plans, Log workout (filled in), Progress.
    name: 'phone-tabs',
    persona: 'a',
    images: ['p03-plans', 'p04-log', 'p05-progress'],
    async run(s) {
      const { page, t } = s
      await plansLoaded(s)
      await shot(s, 'p03-plans')

      await tab(s, 'nav.log').click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await fillWorkout(s)
      await s.scrollTo('label[for="workout-plan"]', 12)
      await shot(s, 'p04-log')

      await tab(s, 'nav.progress').click()
      await page.locator('#suggestions-title').waitFor()
      await s.settle(800)
      await page.evaluate(() => window.scrollTo(0, 0))
      await shot(s, 'p05-progress')
    },
  },

  {
    // No signal. Opened with a connection first (the app saves what it loaded), then the phone goes offline,
    // a workout is logged and kept, and the connection comes back: the workout is sent, once.
    name: 'phone-offline',
    persona: 'a',
    images: ['p06-offline-saved', 'p07-offline-log', 'p08-kept', 'p09-waiting', 'p10-sent'],
    async run(s) {
      const { page, t } = s
      await plansLoaded(s)
      await savedOnPhone(s, ['plans', 'planOptions', 'progress'])
      await s.goOffline()
      await page.locator('.status-bar').waitFor()

      // My plans again, now from the copy saved on the phone.
      await tab(s, 'nav.log').click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await tab(s, 'nav.myPlans').click()
      await page.locator('.state-saved').waitFor()
      await s.settle(500)
      await shot(s, 'p06-offline-saved')

      // The form works as usual.
      await tab(s, 'nav.log').click()
      await page.getByRole('heading', { name: t('log.title'), level: 1 }).waitFor()
      await fillWorkout(s)
      await page.evaluate(() => window.scrollTo(0, 0))
      await s.settle(300)
      await shot(s, 'p07-offline-log')

      // Save without signal.
      await page.getByRole('button', { name: t('workout.submit'), exact: true }).click()
      const kept = page.locator('.state-success')
      await kept.waitFor()
      await kept.evaluate((element) => element.scrollIntoView({ block: 'center' }))
      await s.settle(300)
      await shot(s, 'p08-kept')

      // It waits under its plan.
      await kept.getByRole('link', { name: t('workout.seeInPlans') }).click()
      await page.locator('.workout-waiting').waitFor()
      await s.settle(500)
      await page.evaluate(() => window.scrollTo(0, 0))
      await shot(s, 'p09-waiting')

      // The connection comes back: the workout goes out by itself, once.
      await s.goOnline()
      await page.locator('.workout-waiting').waitFor({ state: 'detached' })
      await page.locator('.status-bar').waitFor({ state: 'detached' })
      await s.settle(800)
      const sent = s.mock.calls.log_workout ?? []
      if (sent.length !== 1) throw new Error(`p10: expected exactly one rpc/log_workout, the mock got ${sent.length}`)
      const keys = Object.keys(sent[0])
      for (const key of ['p_id', 'p_logged_at']) {
        if (!keys.includes(key)) throw new Error(`p10: the log_workout request has no ${key} (keys: ${keys.join(', ')})`)
      }
      console.log(`  p10 (${s.lang}): rpc/log_workout sent once, body keys: ${keys.join(', ')}`)
      await shot(s, 'p10-sent')
    },
  },

  {
    // A database from before v5 has no schema_version(): the app works, with a warning line (not hidden).
    name: 'phone-old-db',
    persona: 'a',
    schemaVersion: 'missing',
    images: ['p11-old-db'],
    async run(s) {
      await plansLoaded(s)
      await s.page.locator('.status-bar').waitFor()
      await s.settle(500)
      await shot(s, 'p11-old-db')
    },
  },

  {
    // An instructor's phone: My athletes with the demo athletes A and B; the bottom bar ends with My athletes.
    name: 'phone-instructor',
    persona: 'coach',
    path: '/athletes',
    images: ['p12-instructor'],
    async run(s) {
      await s.page.getByText('demo.athlete.b@example.com').waitFor()
      await s.settle(800)
      await shot(s, 'p12-instructor')
    },
  },
]

module.exports = {
  id: 'P',
  name: 'phone',
  world: 'demo',
  worldOptions: { afterLtDemo: true, martinsPlan: false },
  outDir: (lang) => path.join(REPO, '_task', 'results', 'screenshots', lang, 'phone'),
  format: 'jpeg',
  quality: 88,
  defaults: { viewport: { width: 390, height: 780 }, scale: 2, now: '2026-11-12T16:50:00Z' },
  scenes,
}
