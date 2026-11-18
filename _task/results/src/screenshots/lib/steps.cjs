'use strict'
// UI steps several sets share. Each takes the scene's `s` (see README.md).

/** A plan's card on My plans, found by the plan's name. */
const planCard = (s, name) => s.page.locator('li.plan').filter({ has: s.page.getByRole('heading', { name, level: 2 }) })

/** A card of the Progress or athlete page, found by the id of its heading. */
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

module.exports = { planCard, cardOf, addExercise, savedOnPhone }
