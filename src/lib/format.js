import { getLanguage, getLocale, t } from '../i18n/i18n'

// workouts.type is the routing field: 'strength' → Zapier path A.
export const typeLabel = (type) => (type === 'strength' || type === 'other' ? t(`type.${type}`) : type)

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
}

/** 'YYYY-MM-DD' (a local calendar date) → "Nov 2". */
export function formatCalendarDay(ymd) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
}

/** 102.5 → "102.5" (Lithuanian: "102,5"), 100 → "100" (no float noise, no trailing zeros). */
export function formatNumber(value, digits = 2) {
  const text = String(Number(Number(value).toFixed(digits)))
  return getLanguage() === 'lt' ? text.replace('.', ',') : text
}

export const formatKg = (value) => formatNumber(value)

// workouts.activity values; their labels are activity.<value> in the translations.
export const ACTIVITY_VALUES = ['run', 'bike', 'swim', 'walk', 'row', 'other']

/** The label of a workouts.activity value (an unknown value is shown as it is). */
export const activityLabel = (value) => (ACTIVITY_VALUES.includes(value) ? t(`activity.${value}`) : value)
