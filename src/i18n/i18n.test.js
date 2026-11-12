import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { friendlyError } from '../lib/errors'
import { formatKg } from '../lib/format'
import { describeGoal } from '../lib/goals'
import { DEFAULT_LANGUAGE, getLanguage, setLanguage, STORAGE_KEY, t } from './i18n'
import { translations } from './translations'

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

describe('translations', () => {
  it('has the same keys in English and Lithuanian, except plural forms Lithuanian needs', () => {
    const base = (key) => key.replace(/\.(one|few|other)$/, '')
    const en = new Set(Object.keys(translations.en).map(base))
    const lt = new Set(Object.keys(translations.lt).map(base))
    expect([...en].filter((key) => !lt.has(key))).toEqual([])
    expect([...lt].filter((key) => !en.has(key))).toEqual([])
  })

  it('uses the same {placeholders} in both languages', () => {
    for (const [key, text] of Object.entries(translations.lt)) {
      const english = translations.en[key] ?? translations.en[key.replace(/\.(one|few)$/, '.other')]
      expect(placeholders(text), key).toEqual(placeholders(english))
    }
  })

  it('has no empty text', () => {
    for (const dictionary of Object.values(translations)) {
      for (const [key, text] of Object.entries(dictionary)) expect(text.trim(), key).not.toBe('')
    }
  })

  it('defines every key the source uses as t(\'…\')', () => {
    const files = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.jsx?$/.test(name) && !/\.test\./.test(name) && !path.includes('translations')) files.push(path)
      }
    }
    walk(join(process.cwd(), 'src'))

    const used = new Set()
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(match[1])
    }
    expect(used.size).toBeGreaterThan(100)

    const has = (language, key) =>
      key in translations[language] || `${key}.other` in translations[language]
    for (const key of used) {
      expect(has('en', key), `en: ${key}`).toBe(true)
      expect(has('lt', key), `lt: ${key}`).toBe(true)
    }
  })
})

describe('t', () => {
  it('fills in {placeholders}', () => {
    expect(t('plan.created', { name: 'Strength block' })).toBe('Plan created: Strength block.')
    setLanguage('lt')
    expect(t('plan.created', { name: 'Jėgos ciklas' })).toBe('Planas sukurtas: Jėgos ciklas.')
  })

  it('picks the plural form of the current language', () => {
    expect([1, 2, 5].map((count) => t('athletes.workouts7', { count }))).toEqual([
      '1 workout in the last 7 days',
      '2 workouts in the last 7 days',
      '5 workouts in the last 7 days',
    ])

    setLanguage('lt')
    expect([1, 2, 9, 11, 12, 20, 21, 22, 30].map((count) => t('athletes.workouts7', { count }))).toEqual([
      'Per pastarąsias 7 dienas: 1 treniruotė',
      'Per pastarąsias 7 dienas: 2 treniruotės',
      'Per pastarąsias 7 dienas: 9 treniruotės',
      'Per pastarąsias 7 dienas: 11 treniruočių',
      'Per pastarąsias 7 dienas: 12 treniruočių',
      'Per pastarąsias 7 dienas: 20 treniruočių',
      'Per pastarąsias 7 dienas: 21 treniruotė',
      'Per pastarąsias 7 dienas: 22 treniruotės',
      'Per pastarąsias 7 dienas: 30 treniruočių',
    ])
  })

  it('shows the key itself when there is no text for it', () => {
    expect(t('no.such.key')).toBe('no.such.key')
  })
})

describe('the language store', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  async function freshStore() {
    vi.resetModules()
    return import('./i18n')
  }

  it('starts in Lithuanian when nothing is saved', async () => {
    window.localStorage.clear()
    const store = await freshStore()
    expect(DEFAULT_LANGUAGE).toBe('lt')
    expect(store.getLanguage()).toBe('lt')
    expect(document.documentElement.lang).toBe('lt')
  })

  it('remembers the choice across a page reload', async () => {
    setLanguage('en')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en')

    const reloaded = await freshStore()
    expect(reloaded.getLanguage()).toBe('en')

    reloaded.setLanguage('lt')
    expect((await freshStore()).getLanguage()).toBe('lt')
  })

  it('ignores a saved value that is not a language', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'de')
    expect((await freshStore()).getLanguage()).toBe('lt')
  })

  it('still works when the browser refuses to store anything', async () => {
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const store = await freshStore()
    store.setLanguage('en')
    expect(store.getLanguage()).toBe('en')
    blocked.mockRestore()
  })
})

describe('setLanguage', () => {
  beforeEach(() => setLanguage('en'))

  it('updates <html lang> and tells subscribers', () => {
    setLanguage('lt')
    expect(getLanguage()).toBe('lt')
    expect(document.documentElement.lang).toBe('lt')
  })

  it('ignores an unknown language', () => {
    setLanguage('de')
    expect(getLanguage()).toBe('en')
  })
})

describe('texts built outside components', () => {
  it('follow the language', () => {
    const goal = { exercise: 'Squat', target_kg: 120, target_date: '2999-01-01' }
    const status = { state: 'active', remaining: 22.5, daysLeft: 3 }
    expect(describeGoal(goal, status)).toBe('22.5 kg to go, 3 days left.')
    expect(friendlyError({ code: 'invalid_credentials' })).toBe('Wrong email or password.')

    setLanguage('lt')
    expect(describeGoal(goal, status)).toBe('Liko 22,5 kg, iki termino – 3 dienos.')
    expect(friendlyError({ code: 'invalid_credentials' })).toBe('Neteisingas el. paštas arba slaptažodis.')
    expect(formatKg(102.5)).toBe('102,5')
  })

  it('translate the messages the database raises on purpose, and leave other ones alone', () => {
    setLanguage('lt')
    expect(friendlyError({ message: 'No instructor has that code. Check it and try again.' })).toBe(
      'Joks treneris neturi tokio kodo. Patikrinkite jį ir bandykite dar kartą.',
    )
    expect(friendlyError({ message: 'Something the database said' })).toBe('Something the database said')
  })
})
