import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUser } from './currentUser'
import { addToOutbox, getOutbox, removeItem, subscribeOutbox, updateItem, useOutbox } from './outbox'
import { readSaved, saveData } from './savedData'
import { keysStartingWith, readJson, writeJson } from './storage'

const WORKOUT = {
  planId: 'plan-1',
  title: 'Leg day',
  type: 'strength',
  durationMin: 60,
  activity: null,
  distanceKm: null,
  notes: null,
  sets: [{ exercise: 'Squat', set_no: 1, reps: 5, weight_kg: 100 }],
}
const ID = 'b2c4e6a8-1d3f-4a5b-8c7d-9e0f1a2b3c4d'
const FAILED = {
  message: 'insert or update on table "workouts" violates foreign key constraint "workouts_plan_id_fkey"',
  code: '23503',
}

const keep = (title, options = {}) =>
  addToOutbox({ workout: { ...WORKOUT, title }, planName: 'Strength block', ...options })
const storageFull = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError')

beforeEach(() => {
  setCurrentUser('user-1')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('outbox', () => {
  it('keeps a workout with an id made on the phone and the time Save was pressed', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(ID)

    const item = addToOutbox({
      workout: WORKOUT,
      planName: 'Strength block',
      now: new Date('2026-11-16T16:42:00.000Z'),
    })

    expect(item).toEqual({
      id: ID,
      loggedAt: '2026-11-16T16:42:00.000Z',
      workout: WORKOUT,
      planName: 'Strength block',
      status: 'waiting',
      error: null,
    })
    expect(readJson('logify.outbox.v1.user-1')).toEqual([item])
    expect(getOutbox()).toEqual([item])
  })

  it('makes a version-4 id where crypto.randomUUID is missing (http on a LAN address)', () => {
    const own = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true, writable: true })
    try {
      const first = keep('Monday')
      const second = keep('Tuesday')

      expect(first.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(second.id).not.toBe(first.id)
      expect(getOutbox()).toEqual([first, second])

      // The version and variant bits are set whatever the random bytes are.
      vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce((bytes) => bytes.fill(0xff))
      expect(keep('Wednesday').id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
    } finally {
      if (own) Object.defineProperty(crypto, 'randomUUID', own)
      else delete crypto.randomUUID
    }
    expect(typeof crypto.randomUUID).toBe('function')
  })

  it('returns the same list until it changes', () => {
    const empty = getOutbox()
    expect(getOutbox()).toBe(empty)

    const item = keep('Leg day')
    const one = getOutbox()
    expect(one).toEqual([item])
    expect(getOutbox()).toBe(one)

    updateItem(item.id, { status: 'failed', error: FAILED })
    expect(getOutbox()).not.toBe(one)
    expect(getOutbox()).toEqual([{ ...item, status: 'failed', error: FAILED }])
  })

  it('updates and removes one workout, keeping the order of the rest', () => {
    const monday = keep('Monday')
    const tuesday = keep('Tuesday')
    const wednesday = keep('Wednesday')

    updateItem(tuesday.id, { status: 'failed', error: FAILED })
    removeItem(monday.id)
    expect(getOutbox()).toEqual([{ ...tuesday, status: 'failed', error: FAILED }, wednesday])

    removeItem(tuesday.id)
    removeItem(wednesday.id)
    expect(getOutbox()).toEqual([])
    expect(keysStartingWith('logify.outbox.v1.')).toEqual([])

    // A workout that is gone (sent, or deleted) stays gone.
    updateItem(tuesday.id, { status: 'waiting' })
    expect(getOutbox()).toEqual([])
  })

  it("keeps each user's workouts apart", () => {
    const mine = keep('Mine')

    setCurrentUser('user-2')
    expect(getOutbox()).toEqual([])
    const theirs = keep('Theirs')

    setCurrentUser('user-1')
    expect(getOutbox()).toEqual([mine])
    expect(readJson('logify.outbox.v1.user-2')).toEqual([theirs])
  })

  it('tells subscribers about changes, also those made in another tab', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeOutbox(listener)

    keep('Leg day')
    expect(listener).toHaveBeenCalledTimes(1)

    // Another tab sent it, or cleared the storage.
    localStorage.removeItem('logify.outbox.v1.user-1')
    window.dispatchEvent(new StorageEvent('storage', { key: 'logify.outbox.v1.user-1' }))
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(listener).toHaveBeenCalledTimes(3)
    expect(getOutbox()).toEqual([])

    // Another user's outbox, or another key, is not this one.
    window.dispatchEvent(new StorageEvent('storage', { key: 'logify.outbox.v1.user-2' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'logify.language' }))
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    keep('Leg day')
    window.dispatchEvent(new StorageEvent('storage', { key: 'logify.outbox.v1.user-1' }))
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('useOutbox follows the outbox and who is signed in', () => {
    const { result } = renderHook(() => useOutbox())
    expect(result.current).toEqual([])

    let item
    act(() => {
      item = keep('Leg day')
    })
    expect(result.current).toEqual([item])

    act(() => setCurrentUser('user-2'))
    expect(result.current).toEqual([])

    act(() => setCurrentUser('user-1'))
    expect(result.current).toEqual([item])
  })

  it('makes room by dropping saved data when the phone is full', () => {
    saveData('plans', ['mine'], 1000)
    setCurrentUser('user-2')
    saveData('plans', ['theirs'], 1000)
    setCurrentUser('user-1')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw storageFull()
    })

    const item = keep('Leg day')

    expect(getOutbox()).toEqual([item])
    expect(readSaved('plans')).toBeNull()
    // Only this user's saved data goes.
    expect(readJson('logify.cache.v1.user-2.plans')).toEqual({ savedAt: 1000, data: ['theirs'] })
  })

  it("throws storage_full when the phone still can't keep the workout", () => {
    const monday = keep('Monday')
    saveData('plans', ['mine'], 1000)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw storageFull()
    })

    expect(() => keep('Tuesday')).toThrow(expect.objectContaining({ code: 'storage_full' }))

    expect(getOutbox()).toEqual([monday])
    expect(readSaved('plans')).toBeNull()
  })

  it('keeps nothing without a signed-in user', () => {
    setCurrentUser(null)

    expect(() => keep('Leg day')).toThrow()

    expect(getOutbox()).toEqual([])
    expect(keysStartingWith('logify.outbox.v1.')).toEqual([])
  })

  it('a workout left Sending by an earlier page waits again when its user signs in', () => {
    setCurrentUser(null)
    const cutOff = {
      id: ID,
      loggedAt: '2026-11-16T16:42:00.000Z',
      workout: WORKOUT,
      planName: 'Strength block',
      status: 'sending',
      error: null,
    }
    const failed = { ...cutOff, id: 'c3d5f7b9-2e4a-4b6c-9d8e-0f1a2b3c4d5e', status: 'failed', error: FAILED }
    writeJson('logify.outbox.v1.user-1', [cutOff, failed])

    setCurrentUser('user-1')

    expect(getOutbox()).toEqual([{ ...cutOff, status: 'waiting' }, failed])
  })

  it('leaves alone a workout this page is still sending', () => {
    const saving = keep('Monday', { status: 'sending' })
    const syncing = keep('Tuesday')
    updateItem(syncing.id, { status: 'sending' })

    setCurrentUser('user-2')
    setCurrentUser('user-1')

    expect(getOutbox()).toEqual([saving, { ...syncing, status: 'sending' }])
  })
})
