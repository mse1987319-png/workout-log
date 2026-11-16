import { afterEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUser } from './currentUser'
import { clearSavedData, readSaved, saveData } from './savedData'
import { keysStartingWith, readJson, writeJson } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saved data', () => {
  it("keeps each user's data apart", () => {
    setCurrentUser('user-1')
    saveData('plans', [{ id: 'p1', name: 'Strength' }], 1000)
    expect(readJson('logify.cache.v1.user-1.plans')).toEqual({ savedAt: 1000, data: [{ id: 'p1', name: 'Strength' }] })

    setCurrentUser('user-2')
    expect(readSaved('plans')).toBeNull()

    setCurrentUser('user-1')
    expect(readSaved('plans')).toEqual({ data: [{ id: 'p1', name: 'Strength' }], savedAt: 1000 })
  })

  it("clearSavedData removes only that user's saved data", () => {
    setCurrentUser('user-1')
    saveData('plans', ['mine'], 1000)
    saveData('workout:w1', { id: 'w1' }, 1000)
    writeJson('logify.outbox.v1.user-1', [{ id: 'waiting' }])
    setCurrentUser('user-2')
    saveData('plans', ['theirs'], 1000)

    clearSavedData('user-1')

    expect(keysStartingWith('logify.cache.v1.user-1.')).toEqual([])
    expect(readSaved('plans')).toEqual({ data: ['theirs'], savedAt: 1000 })
    expect(readJson('logify.outbox.v1.user-1')).toEqual([{ id: 'waiting' }])
  })

  it('keeps at most 30 saved workouts, dropping the oldest', () => {
    setCurrentUser('user-1')
    saveData('plans', [], 1)
    saveData('athlete:a1', {}, 2)
    for (let n = 1; n <= 30; n += 1) saveData(`workout:w${n}`, { id: `w${n}` }, 1000 + n)
    saveData('workout:w1', { id: 'w1' }, 2000) // opened again, so now the newest
    saveData('workout:w31', { id: 'w31' }, 2001)

    expect(keysStartingWith('logify.cache.v1.user-1.workout:')).toHaveLength(30)
    expect(readSaved('workout:w2')).toBeNull()
    expect(readSaved('workout:w1')).not.toBeNull()
    expect(readSaved('workout:w31')).not.toBeNull()
    // Other kinds don't count towards the workouts' limit.
    expect(readSaved('plans')).not.toBeNull()
    expect(readSaved('athlete:a1')).not.toBeNull()
  })

  it('makes room by dropping the oldest saved data when storage is full', () => {
    setCurrentUser('user-2')
    saveData('plans', ['theirs'], 500)
    setCurrentUser('user-1')
    saveData('plans', ['old'], 1000)
    saveData('progress', { sets: [] }, 2000)
    writeJson('logify.outbox.v1.user-1', [{ id: 'waiting' }])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    saveData('instructors', ['new'], 3000)

    expect(readSaved('plans')).toBeNull()
    expect(readSaved('progress')).toEqual({ data: { sets: [] }, savedAt: 2000 })
    expect(readSaved('instructors')).toEqual({ data: ['new'], savedAt: 3000 })
    // A workout waiting to be sent and another user's data are never dropped.
    expect(readJson('logify.outbox.v1.user-1')).toEqual([{ id: 'waiting' }])
    expect(readJson('logify.cache.v1.user-2.plans')).toEqual({ savedAt: 500, data: ['theirs'] })
  })
})
