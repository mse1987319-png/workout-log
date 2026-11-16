import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setLanguage } from '../i18n/i18n'
import { setCurrentUser } from '../offline/currentUser'

// The tests read English texts, while the app starts in Lithuanian.
setLanguage('en')

beforeEach(() => {
  // Clearing also drops the saved language, which setLanguage writes again.
  localStorage.clear()
  sessionStorage.clear()
  setCurrentUser(null)
  setLanguage('en')
})

afterEach(() => {
  cleanup()
})
