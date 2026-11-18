'use strict'
// Runs scenes: opens the real app (the Vite dev server) in Playwright's
// Chromium, signs a persona in without a network call, serves every request to
// *.supabase.co from the mock, fixes the clock, and takes the screenshots.
//
// A scene is plain data plus a function of UI steps; see README.md.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')
const { createMock } = require('./mock.cjs')
const { imageSize } = require('./imageSize.cjs')
const { ZONE } = require('./time.cjs')

const REPO = path.resolve(__dirname, '../../../../..')
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const HIGHLIGHT_COLOR = '#e11d48'

// ---- Playwright and Chromium: nothing is added to the repo's package.json ----

function loadPlaywright() {
  const given = process.env.PLAYWRIGHT_PATH
  const places = given
    ? [given, path.join(given, 'playwright'), path.join(given, 'node_modules', 'playwright')]
    : []
  for (const place of places) {
    try {
      return require(place)
    } catch {
      // try the next place
    }
  }
  try {
    return require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }))
  } catch {
    throw new Error(
      'Playwright was not found. Set PLAYWRIGHT_PATH to its package folder (…/node_modules/playwright), ' +
        'or run from a folder where `require("playwright")` works.',
    )
  }
}

// Chromium that Playwright downloaded earlier (any version), for when the
// installed Playwright wants a build that is not in the cache.
function findCachedChromium() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean)
  const executables = [
    'chrome-headless-shell-win64/chrome-headless-shell.exe',
    'chrome-headless-shell-linux64/chrome-headless-shell',
    'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    'chrome-headless-shell-mac-x64/chrome-headless-shell',
  ]
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    const builds = fs
      .readdirSync(root)
      .map((name) => name.match(/^chromium_headless_shell-(\d+)$/))
      .filter(Boolean)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
    for (const [name] of builds) {
      for (const executable of executables) {
        const full = path.join(root, name, executable)
        if (fs.existsSync(full)) return full
      }
    }
  }
  return null
}

async function launchBrowser() {
  const { chromium } = loadPlaywright()
  if (process.env.PLAYWRIGHT_CHROMIUM) return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM })
  try {
    return await chromium.launch()
  } catch (error) {
    const found = findCachedChromium()
    if (!found) throw error
    return chromium.launch({ executablePath: found })
  }
}

// ---- Project settings read from the repo (never printed) ----

/** The first label of the Supabase host in .env.local: the key of the stored session. */
function supabaseRef() {
  if (process.env.SUPABASE_REF) return process.env.SUPABASE_REF
  const text = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8')
  const url = text.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim()
  if (!url) throw new Error('VITE_SUPABASE_URL is missing from .env.local')
  return new URL(url).hostname.split('.')[0]
}

let translationsPromise
function loadTranslations() {
  translationsPromise ??= import(pathToFileURL(path.join(REPO, 'src/i18n/translations.js')).href).then((m) => m.translations)
  return translationsPromise
}

/** t(key, params): the app's own text for a key, so scenes follow copy changes. */
function makeT(translations, lang) {
  const rules = new Intl.PluralRules(lang === 'lt' ? 'lt-LT' : 'en-US')
  return (key, params = {}) => {
    let template
    for (const dictionary of [translations[lang], translations.en]) {
      template = dictionary[key]
      if (template === undefined && typeof params.count === 'number') {
        template = dictionary[`${key}.${rules.select(params.count)}`] ?? dictionary[`${key}.other`]
      }
      if (template !== undefined) break
    }
    if (template === undefined) throw new Error(`no translation for "${key}"`)
    return template.replace(/\{(\w+)\}/g, (placeholder, name) => (name in params ? String(params[name]) : placeholder))
  }
}

// ---- Browser-side helpers, injected into every page ----

// Runs before the app. Seeds the signed-in session and the language once per
// browser profile (a reload keeps what the app has stored since), and keeps
// Vite's hot-reload socket from ever connecting, so going offline or online
// never makes the dev server reload the page.
function initScript({ storage }) {
  if (!localStorage.getItem('__screenshots_seeded')) {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value)
    localStorage.setItem('__screenshots_seeded', '1')
  }
  const NativeWebSocket = window.WebSocket
  window.WebSocket = function (url, protocols) {
    const list = Array.isArray(protocols) ? protocols : [protocols]
    if (list.includes('vite-hmr')) return new EventTarget()
    return new NativeWebSocket(url, protocols)
  }
  Object.assign(window.WebSocket, NativeWebSocket)
  window.WebSocket.prototype = NativeWebSocket.prototype
}

// ---- A scene's session ----

async function openScene({ browser, set, scene, lang, translations, ref }) {
  const defaults = set.defaults ?? {}
  const viewport = scene.viewport ?? defaults.viewport ?? { width: 1100, height: 800 }
  const scale = scene.scale ?? defaults.scale ?? 1.5
  const now = new Date(scene.now ?? defaults.now)
  const built = require('../worlds/index.cjs')[scene.world ?? set.world].build()
  const mock = createMock({ world: built.world, now: () => now })
  if (scene.schemaVersion) mock.state.schemaVersion = scene.schemaVersion // 'missing': a database from before v5
  const user = scene.persona ? built.personas[scene.persona] : null
  if (scene.persona && !user) throw new Error(`scene "${scene.name}": no persona "${scene.persona}" in its world`)

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    timezoneId: ZONE,
    locale: lang === 'lt' ? 'lt-LT' : 'en-US',
    colorScheme: 'light',
    serviceWorkers: 'block',
    userAgent: scene.userAgent,
    hasTouch: scene.hasTouch,
    isMobile: scene.isMobile,
  })
  const storage = { 'logify.language': lang }
  if (user) storage[`sb-${ref}-auth-token`] = JSON.stringify(mock.sessionFor(user))
  await context.addInitScript(initScript, { storage })
  if (scene.init) await context.addInitScript(scene.init)
  await context.clock.setFixedTime(now)

  // Nothing leaves the machine: the project is the mock, anything else is refused and counted.
  const external = []
  await context.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname) && !url.hostname.endsWith('.supabase.co') && /^https?:$/.test(url.protocol),
    (route) => {
      external.push(route.request().url())
      return route.abort('failed')
    },
  )
  await context.route((url) => url.hostname.endsWith('.supabase.co'), (route) => mock.handle(route))

  const page = await context.newPage()
  const problems = []
  page.on('console', (message) => {
    // A phone that is offline fails its requests on purpose; that is not news.
    if (message.type() === 'error' && !message.text().includes('ERR_INTERNET_DISCONNECTED')) problems.push(`console error: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  return { context, page, mock, user, viewport, scale, t: makeT(translations, lang), external, problems, built }
}

/** What a scene's `run(s)` gets. */
function makeApi({ session, set, lang, outRoot, written, failures }) {
  const { page, context, mock, viewport } = session
  const format = set.format ?? 'png'
  const referenceDir = set.outDir(lang)
  // --out=<folder> keeps the repo's folder layout under that folder, so a trial run replaces nothing.
  const outDir = outRoot ? path.join(outRoot, path.relative(REPO, referenceDir)) : referenceDir

  const api = {
    page,
    context,
    mock,
    lang,
    t: session.t,
    persona: session.user,
    world: mock.world,

    /** Opens a path of the app (a full page load). */
    async goto(route = '/') {
      await page.goto(BASE_URL + route)
    },

    /** Waits until the page is quiet: fonts ready, nothing says "Loading…", then `ms` more. */
    async settle(ms = 500) {
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => !document.querySelector('.state-loading'), null, { timeout: 15000 })
      await page.waitForTimeout(ms)
    },

    /** Takes the mouse and the keyboard focus out of the way (no hover or focus ring in the image). */
    async calm() {
      await page.mouse.move(1, 400)
      await page.evaluate(() => document.activeElement?.blur?.())
    },

    /** The browser loses its connection; the mock stops answering as well. */
    async goOffline() {
      mock.state.offline = true
      await context.setOffline(true)
    },
    async goOnline() {
      mock.state.offline = false
      await context.setOffline(false)
    },

    /** Chrome's "install this app" offer arrives (what makes the install card show Install). */
    async offerInstall() {
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt', { cancelable: true })
        event.prompt = () => Promise.resolve()
        event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' })
        window.dispatchEvent(event)
      })
    },

    /** A red rounded frame around an element (the manuals' "highlighted"). Returns a function that removes it. */
    async highlight(target, { pad = 6, padX = pad, padY = pad, radius = 12, width = 3 } = {}) {
      const locator = typeof target === 'string' ? page.locator(target).first() : target
      await locator.scrollIntoViewIfNeeded()
      const id = `__hl_${Math.random().toString(36).slice(2)}`
      await locator.evaluate(
        (element, args) => {
          const rect = element.getBoundingClientRect()
          const box = document.createElement('div')
          box.id = args.id
          box.setAttribute('data-screenshot-highlight', '')
          Object.assign(box.style, {
            position: 'absolute',
            left: `${rect.left + window.scrollX - args.padX - args.width}px`,
            top: `${rect.top + window.scrollY - args.padY - args.width}px`,
            width: `${rect.width + 2 * args.padX + 2 * args.width}px`,
            height: `${rect.height + 2 * args.padY + 2 * args.width}px`,
            boxSizing: 'border-box',
            border: `${args.width}px solid ${args.color}`,
            borderRadius: `${args.radius}px`,
            pointerEvents: 'none',
            zIndex: '2147483647',
          })
          document.body.appendChild(box)
        },
        { id, padX, padY, radius, width, color: HIGHLIGHT_COLOR },
      )
      return () => page.evaluate((boxId) => document.getElementById(boxId)?.remove(), id)
    },

    /**
     * Writes one image.
     *   element    a selector or locator: the picture is that element's box
     *   height     CSS px (or 'page' for the page's full height): the picture is this tall from the top of the page, or of the element
     *   highlight  [{ target, ...options }]: frames drawn for this picture only
     *   size       [w, h] in image px, when there is no earlier image of that name to match
     * The image must have the pixel size of the file it replaces; a new name needs `size`.
     */
    async shot(name, { element, height, highlight = [], size, calm = true } = {}) {
      if (calm) await api.calm()
      const removers = []
      for (const item of highlight) {
        const { target, ...options } = item.target === undefined ? { target: item } : item
        removers.push(await api.highlight(target, options))
      }
      await page.evaluate(() => document.fonts.ready)

      const options = { type: format === 'jpeg' ? 'jpeg' : 'png', quality: format === 'jpeg' ? (set.quality ?? 88) : undefined, animations: 'disabled' }
      let buffer
      if (!element && !height) {
        // What is on screen right now (fixed bars, like the phone's tab bar, stay where they are).
        buffer = await page.screenshot(options)
      } else if (element && !height) {
        // An element's own picture: Playwright rounds its box to whole pixels.
        const locator = typeof element === 'string' ? page.locator(element).first() : element
        await locator.scrollIntoViewIfNeeded()
        buffer = await locator.screenshot(options)
      } else {
        let clip
        if (element) {
          const locator = typeof element === 'string' ? page.locator(element).first() : element
          await locator.scrollIntoViewIfNeeded()
          clip = await locator.evaluate((el) => {
            const rect = el.getBoundingClientRect()
            return { x: rect.left + window.scrollX, y: rect.top + window.scrollY, width: rect.width, height: rect.height }
          })
        } else {
          clip = { x: 0, y: 0, width: viewport.width, height: viewport.height }
        }
        // height: a number of CSS px, or 'page' for the whole page as it is.
        if (height === 'page') clip.height = await page.evaluate(() => document.documentElement.scrollHeight)
        else if (height) clip.height = height
        // A picture taller than the page (a page that is a little shorter than it was)
        // needs the page to be that tall: it can only show what is on it.
        const reach = clip.y + clip.height
        await page.evaluate((needed) => {
          if (document.documentElement.scrollHeight < needed) document.body.style.minHeight = `${needed}px`
        }, reach)
        buffer = await page.screenshot({ ...options, fullPage: true, clip })
        await page.evaluate(() => {
          document.body.style.minHeight = ''
        })
      }
      for (const remove of removers) await remove()

      const file = `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`
      const got = imageSize(buffer)
      const known = path.join(referenceDir, file)
      const expected = size ? { width: size[0], height: size[1] } : fs.existsSync(known) ? imageSize(fs.readFileSync(known)) : null
      if (!expected) throw new Error(`${file}: a new image needs size: [width, height] (image px)`)
      if (got.width !== expected.width || got.height !== expected.height) {
        // Not written; the scene goes on, so one run lists every wrong size.
        failures.push(`${file}: is ${got.width}x${got.height}, must be ${expected.width}x${expected.height}`)
        return buffer
      }
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, file), buffer)
      written.push({ file, ...got, dir: outDir })
      return buffer
    },
  }
  return api
}

/** Runs one scene in one language; resolves to { written, unmatched, problems }. */
async function runScene({ browser, set, scene, lang, outRoot, translations, ref }) {
  const session = await openScene({ browser, set, scene, lang, translations, ref })
  const written = []
  const failures = []
  try {
    const api = makeApi({ session, set, lang, outRoot, written, failures })
    await api.goto(scene.path ?? '/')
    await scene.run(api)
    return { written, failures, unmatched: session.mock.unmatched, external: session.external, problems: session.problems }
  } catch (error) {
    error.written = written
    error.unmatched = session.mock.unmatched
    throw error
  } finally {
    await session.context.close()
  }
}

module.exports = { launchBrowser, runScene, loadTranslations, supabaseRef, BASE_URL, REPO }
