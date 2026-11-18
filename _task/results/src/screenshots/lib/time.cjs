'use strict'
// Time helpers for fixtures. The screenshots are taken in the Europe/Vilnius
// time zone (the same zone the browser is given), so fixtures are written as
// local wall-clock times ("2026-11-10 18:05") and turned into UTC here, with
// the daylight-saving shift of that very day.

const ZONE = 'Europe/Vilnius'

// Minutes that `zone` is ahead of UTC at the instant `utcMs`.
function offsetMinutes(utcMs, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - utcMs) / 60000)
}

/** "2026-11-10 18:05" (local to `zone`) → a Date. */
function local(text, zone = ZONE) {
  const [day, clock = '12:00'] = text.split(' ')
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm = 0] = clock.split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, hh, mm)
  let utc = wall - offsetMinutes(wall, zone) * 60000
  // One more pass settles the hours around a clock change.
  utc = wall - offsetMinutes(utc, zone) * 60000
  return new Date(utc)
}

/** A timestamp as PostgREST writes it: "2026-11-10T16:05:00+00:00". */
function pgTimestamp(date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

/**
 * "2026-11-10 18:05" (local) → PostgREST timestamp. A text that ends in Z
 * ("2026-11-10T16:05:00Z") is already UTC: the database stores workouts
 * logged "at 18:00" by its own clock that way.
 */
function at(text, zone = ZONE) {
  return pgTimestamp(text.endsWith('Z') ? new Date(text) : local(text, zone))
}

/** The UTC calendar date ('YYYY-MM-DD') of an instant: what the database's current_date is. */
function utcDay(date) {
  return new Date(date).toISOString().slice(0, 10)
}

module.exports = { ZONE, local, at, pgTimestamp, utcDay }
