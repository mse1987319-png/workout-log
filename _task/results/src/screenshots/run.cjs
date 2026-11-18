'use strict'
// node run.cjs <set> [lang] [--only=name,name] [--out=folder]
//   <set>   M (user manuals), or any set in sets/index.cjs
//   lang    en | lt | both (default both)
//   --only  run only the scenes or images with these names
//   --out   write under this folder instead of replacing the repo's images (same layout)
// Start the app first (npm run dev); see README.md.

const path = require('path')
const { launchBrowser, runScene, loadTranslations, supabaseRef, BASE_URL } = require('./lib/harness.cjs')
const sets = require('./sets/index.cjs')

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('--'))
  const options = Object.fromEntries(
    argv.filter((arg) => arg.startsWith('--')).map((arg) => {
      const [key, value = 'true'] = arg.slice(2).split('=')
      return [key, value]
    }),
  )
  return { positional, options }
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2))
  const [setName, langArg = 'both'] = positional
  const set = setName && sets.find((candidate) => [candidate.id, candidate.name].includes(setName))
  if (!set || !['en', 'lt', 'both'].includes(langArg)) {
    console.error(`usage: node run.cjs <set: ${sets.map((s) => `${s.id}|${s.name}`).join(', ')}> [en|lt|both] [--only=a,b] [--out=folder]`)
    process.exit(2)
  }
  const langs = langArg === 'both' ? ['en', 'lt'] : [langArg]
  const only = options.only ? options.only.split(',') : null
  const outRoot = options.out ? path.resolve(options.out) : null

  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    console.error(`The app is not answering at ${BASE_URL} (${error.message}). Start it with: npm run dev`)
    process.exit(2)
  }

  const translations = await loadTranslations()
  const ref = supabaseRef()
  const browser = await launchBrowser()
  const failures = []
  const dirty = []
  let images = 0

  for (const lang of langs) {
    for (const scene of set.scenes) {
      const names = [scene.name, ...(scene.images ?? [])]
      if (only && !names.some((name) => only.includes(name))) continue
      const label = `${lang} ${scene.name}`
      try {
        const result = await runScene({ browser, set, scene, lang, outRoot, translations, ref })
        for (const image of result.written) {
          images += 1
          console.log(`  ok  ${lang}/${image.file}  ${image.width}x${image.height}`)
        }
        const expected = scene.images ?? []
        const missing = expected.filter((name) => !result.written.some((image) => image.file.replace(/\.\w+$/, '') === name))
        if (!only && missing.length) failures.push(`${label}: did not write ${missing.join(', ')}`)
        for (const line of result.failures) failures.push(`${label}: ${line}`)
        for (const line of result.unmatched) dirty.push(`${label}: unmatched ${line}`)
        for (const line of result.external) dirty.push(`${label}: external request ${line}`)
        for (const line of result.problems) console.log(`  note ${label}: ${line}`)
      } catch (error) {
        for (const line of error.unmatched ?? []) dirty.push(`${label}: unmatched ${line}`)
        for (const image of error.written ?? []) console.log(`  ok  ${lang}/${image.file}  ${image.width}x${image.height}`)
        failures.push(`${label}: ${error.message.split('\n')[0]}`)
        console.error(`  FAIL ${label}: ${error.message}`)
      }
    }
  }
  await browser.close()

  console.log(`\n${images} image(s) written.`)
  console.log(dirty.length ? `UNMATCHED / EXTERNAL REQUESTS:\n  ${dirty.join('\n  ')}` : 'Requests to Supabase that the mock did not answer: none.')
  if (failures.length) console.log(`FAILED:\n  ${failures.join('\n  ')}`)
  process.exit(failures.length || dirty.length ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
