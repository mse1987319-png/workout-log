// Localization core: the current language lives in a tiny store (not in React
// state), so plain helpers such as lib/goals.js can call t() and components
// re-render when it changes (useLanguage, in ./useLanguage.js).
//
// The choice is saved in localStorage, so it survives navigation and reloads.
// Lithuanian is the default.
import { translations } from './translations'

export const LANGUAGES = ['lt', 'en']
export const DEFAULT_LANGUAGE = 'lt'
export const STORAGE_KEY = 'logify.language'

// BCP 47 tags for dates and plural rules.
const LOCALES = { lt: 'lt-LT', en: 'en-US' }

const isLanguage = (value) => LANGUAGES.includes(value)

function readSaved() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return isLanguage(saved) ? saved : null
  } catch {
    return null // storage blocked (private mode, cookies off): fall back to the default
  }
}

let language = readSaved() ?? DEFAULT_LANGUAGE
const listeners = new Set()

// <html lang> and the page description follow the language.
function applyToDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
}

export function getLanguage() {
  return language
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setLanguage(next) {
  if (!isLanguage(next)) return
  try {
    window.localStorage.setItem(STORAGE_KEY, next) // an explicit choice is always saved
  } catch {
    // not saved: the choice still holds until the page is closed
  }
  if (next === language) return
  language = next
  applyToDocument()
  listeners.forEach((listener) => listener())
}

export const getLocale = () => LOCALES[language]

const pluralRules = {}
function pluralCategory(count) {
  pluralRules[language] ??= new Intl.PluralRules(LOCALES[language])
  return pluralRules[language].select(count)
}

/**
 * The text for a key in the current language, with {placeholders} filled in.
 * A key may have plural forms: t('goals.toGo', { count: 3 }) looks for
 * 'goals.toGo.one' / '.few' / '.other' (whichever the language's plural rule
 * picks for 3) when there is no plain 'goals.toGo'. Falls back to English,
 * then to the key itself, so a missing translation is visible but harmless.
 */
export function t(key, params = {}) {
  let template
  for (const dictionary of [translations[language], translations.en]) {
    template = dictionary[key]
    if (template === undefined && typeof params.count === 'number') {
      template = dictionary[`${key}.${pluralCategory(params.count)}`] ?? dictionary[`${key}.other`]
    }
    if (template !== undefined) break
  }
  if (template === undefined) return key
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => (name in params ? String(params[name]) : placeholder))
}

applyToDocument()
