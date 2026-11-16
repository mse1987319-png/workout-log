import { useEffect, useState } from 'react'
import { lastSession } from '../api/sets'
import { useLanguage } from '../i18n/useLanguage'
import { formatDay } from '../lib/format'
import { isNetworkError } from '../lib/errors'
import { formatSets } from '../lib/sets'
import { savedLastSession } from '../offline/hints'

/**
 * "Last time (10 Nov): 2 × 5 @ 100 kg" for an exercise, or "First time
 * logging …". With `before`, only sessions before that time count (so a
 * logged workout does not show itself). Shows nothing while loading or if
 * the lookup fails: it is a hint, not essential. When the network is down
 * it uses the saved Progress data instead.
 */
export default function LastTime({ name, before }) {
  // session: the sets of the last workout, null if there is none, undefined if the lookup failed.
  const [result, setResult] = useState({ key: '', session: undefined })
  const { t } = useLanguage()
  const key = `${name}|${before ?? ''}`

  useEffect(() => {
    if (!name) return undefined
    let current = true
    lastSession(name, { before }).then(
      (session) => {
        if (current) setResult({ key: `${name}|${before ?? ''}`, session })
      },
      (error) => {
        // Offline: the saved progress, if there is any (undefined shows nothing).
        const session = isNetworkError(error) ? savedLastSession(name, { before }) : undefined
        if (current) setResult({ key: `${name}|${before ?? ''}`, session })
      },
    )
    return () => {
      current = false
    }
  }, [name, before])

  if (!name || result.key !== key || result.session === undefined) return null
  // Worded here, not when the lookup finishes, so it follows the language.
  const text = result.session
    ? t('lastTime.last', { date: formatDay(result.session.date), sets: formatSets(result.session.sets) })
    : t('lastTime.first', { name })
  return <p className="hint last-time">{text}</p>
}
