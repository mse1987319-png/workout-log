import { useEffect, useState } from 'react'
import { lastSession } from '../api/sets'
import { formatDay } from '../lib/format'
import { formatSets } from '../lib/sets'

/**
 * "Last time (10 Nov): 2 × 5 @ 100 kg" for an exercise, or "First time
 * logging …". With `before`, only sessions before that time count (so a
 * logged workout does not show itself). Shows nothing while loading or if
 * the lookup fails: it is a hint, not essential.
 */
export default function LastTime({ name, before }) {
  const [result, setResult] = useState({ key: '', text: '' })
  const key = `${name}|${before ?? ''}`

  useEffect(() => {
    if (!name) return undefined
    let current = true
    lastSession(name, { before }).then(
      (session) => {
        if (!current) return
        const text = session
          ? `Last time (${formatDay(session.date)}): ${formatSets(session.sets)}`
          : `First time logging ${name}.`
        setResult({ key: `${name}|${before ?? ''}`, text })
      },
      () => {
        if (current) setResult({ key: `${name}|${before ?? ''}`, text: '' })
      },
    )
    return () => {
      current = false
    }
  }, [name, before])

  if (!name || result.key !== key || !result.text) return null
  return <p className="hint last-time">{result.text}</p>
}
