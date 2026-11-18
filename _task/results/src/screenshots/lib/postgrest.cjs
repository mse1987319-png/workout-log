'use strict'
// The small part of PostgREST's query language that the app uses, as pure
// helpers: ?select=a,b,alias:table(c,d)  ?col=eq.x|lt.x|ilike.x  ?order=a.desc,b
// ?limit=n  and the same for embedded tables (?workouts.order=created_at.desc).
// Anything else throws, so a new kind of request shows up as an unmatched one
// instead of being answered wrongly.

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'])

// "a,b(c,d),e" -> ["a", "b(c,d)", "e"] (commas inside brackets do not split).
function splitTop(text) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current !== '') parts.push(current)
  return parts
}

/**
 * "id,name,plan:plans(id,name)" ->
 *   [{ kind: 'column', name: 'id' }, { kind: 'column', name: 'name' },
 *    { kind: 'embed', alias: 'plan', table: 'plans', columns: [...] }]
 */
function parseSelect(select) {
  return splitTop(select ?? '*').map((part) => {
    const open = part.indexOf('(')
    if (open === -1) return { kind: 'column', name: part.trim() }
    const head = part.slice(0, open)
    const [alias, table] = head.includes(':') ? head.split(':') : [head, head]
    return { kind: 'embed', alias: alias.trim(), table: table.trim(), columns: parseSelect(part.slice(open + 1, -1)) }
  })
}

// Turns a text value into something comparable next to the stored one.
function comparable(stored, text) {
  if (typeof stored === 'number') return [stored, Number(text)]
  if (typeof stored === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(stored) && /^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return [Date.parse(stored), Date.parse(text)]
  }
  return [String(stored), text]
}

// A PostgREST ilike pattern (% and _ wildcards, backslash escapes) as a RegExp.
function likeToRegExp(pattern) {
  let source = ''
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i]
    if (ch === '\\' && i + 1 < pattern.length) {
      i += 1
      source += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (ch === '%' || ch === '*') {
      source += '.*'
    } else if (ch === '_') {
      source += '.'
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${source}$`, 'is')
}

const TESTS = {
  eq: (stored, text) => {
    const [a, b] = comparable(stored, text)
    return a === b
  },
  neq: (stored, text) => !TESTS.eq(stored, text),
  lt: (stored, text) => {
    const [a, b] = comparable(stored, text)
    return a < b
  },
  lte: (stored, text) => {
    const [a, b] = comparable(stored, text)
    return a <= b
  },
  gt: (stored, text) => {
    const [a, b] = comparable(stored, text)
    return a > b
  },
  gte: (stored, text) => {
    const [a, b] = comparable(stored, text)
    return a >= b
  },
  ilike: (stored, text) => likeToRegExp(text).test(String(stored ?? '')),
}

/** The row filters in a query string: [{ column, op, text }]. */
function parseFilters(searchParams) {
  const filters = []
  for (const [key, value] of searchParams.entries()) {
    if (RESERVED.has(key) || key.includes('.')) continue
    const dot = value.indexOf('.')
    const op = value.slice(0, dot)
    if (!TESTS[op]) throw new Error(`unsupported filter ${key}=${value}`)
    filters.push({ column: key, op, text: value.slice(dot + 1) })
  }
  return filters
}

function applyFilters(rows, filters) {
  return rows.filter((row) => filters.every(({ column, op, text }) => row[column] != null && TESTS[op](row[column], text)))
}

/** ?order=a.desc,b.asc (possibly repeated) -> [{ column, desc }]. */
function parseOrder(values) {
  return values
    .flatMap((value) => value.split(','))
    .filter(Boolean)
    .map((item) => {
      const [column, direction = 'asc'] = item.split('.')
      return { column, desc: direction === 'desc' }
    })
}

function compareValues(a, b) {
  if (a === b) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(a)) && /^\d{4}-\d{2}-\d{2}T/.test(String(b))) return Date.parse(a) - Date.parse(b)
  return String(a) < String(b) ? -1 : 1
}

function sortRows(rows, order) {
  if (order.length === 0) return rows
  // Array.prototype.sort is stable, so ties keep the stored order.
  return [...rows].sort((a, b) => {
    for (const { column, desc } of order) {
      const result = compareValues(a[column], b[column])
      if (result !== 0) return desc ? -result : result
    }
    return 0
  })
}

module.exports = { parseSelect, parseFilters, applyFilters, parseOrder, sortRows }
