import { afterEach, describe, expect, it, vi } from 'vitest'
import { keysStartingWith, readJson, removeKey, writeJson } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storage', () => {
  it('reads back what it wrote', () => {
    expect(writeJson('k', { a: [1, 2] })).toBe(true)
    expect(readJson('k')).toEqual({ a: [1, 2] })
    removeKey('k')
    expect(readJson('k')).toBeNull()
  })

  it('gives null for a missing or unreadable value', () => {
    expect(readJson('missing')).toBeNull()
    localStorage.setItem('k', '{oops')
    expect(readJson('k')).toBeNull()
  })

  it('reports false when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeJson('k', 'x')).toBe(false)
  })

  it('lists keys by prefix', () => {
    writeJson('logify.a.1', 1)
    writeJson('logify.a.2', 2)
    writeJson('logify.b.1', 3)
    expect(keysStartingWith('logify.a.').sort()).toEqual(['logify.a.1', 'logify.a.2'])
  })
})
