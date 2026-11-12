import { useSyncExternalStore } from 'react'
import { getLanguage, setLanguage, subscribe, t } from './i18n'

/**
 * { language, setLanguage, t } for a component. Using it makes the component
 * re-render when the language changes; so does `language` in a dependency list
 * of anything memoized from translated text.
 */
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguage)
  return { language, setLanguage, t }
}
