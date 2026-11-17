import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setLanguage } from '../i18n/i18n'
import { setCurrentUser } from '../offline/currentUser'

// findBy*/waitFor give up after 1 s by default. The whole suite runs on all
// cores at once, and a starved test file has been seen to miss that for work
// that takes milliseconds alone. A passing query returns at once, so a longer
// limit only slows a test that is really failing.
configure({ asyncUtilTimeout: 5000 })

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
