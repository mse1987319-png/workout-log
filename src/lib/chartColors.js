import { useEffect, useState } from 'react'

// Chart colors, light and dark steps of the same two hues. Validated with the
// dataviz palette checker against the app's card surfaces (light #ffffff,
// dark #1b2029): all checks pass (CVD ΔE 24.7 / 26.8, contrast ≥ 3:1).
// Strength is orange and Other is blue, like the type badges; text never
// wears these colors.
const LIGHT = {
  strength: '#eb6834',
  other: '#2a78d6',
  surface: '#ffffff',
  grid: '#e9ecf1',
  axis: '#c3c9d2',
  text: '#1d2330',
  muted: '#5b6475',
}

const DARK = {
  strength: '#d95926',
  other: '#3987e5',
  surface: '#1b2029',
  grid: '#2a313d',
  axis: '#3a4352',
  text: '#e7eaf0',
  muted: '#a3acbc',
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The chart colors for the current color scheme, following OS changes. */
export function useChartColors() {
  const [dark, setDark] = useState(() => window.matchMedia?.(DARK_QUERY).matches ?? false)

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY)
    if (!query) return undefined
    const onChange = (event) => setDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return dark ? DARK : LIGHT
}
