import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setLanguage } from '../i18n/i18n'

// The tests read English texts, while the app starts in Lithuanian.
setLanguage('en')

beforeEach(() => {
  setLanguage('en')
})

afterEach(() => {
  cleanup()
})
