// The outbox (spec §4): workouts logged on this phone that the server hasn't
// taken yet. Each person has their own list, under logify.outbox.v1.<user id>,
// so on a shared phone nobody sees or sends another's. An item is
// { id, loggedAt, workout, planName, status, error }, status 'waiting' |
// 'sending' | 'failed'. This file only keeps them; sync.js sends them.
import { useSyncExternalStore } from 'react'
import { getCurrentUser, subscribeCurrentUser } from './currentUser'
import { clearSavedData } from './savedData'
import { removeKey, writeJson } from './storage'

const PREFIX = 'logify.outbox.v1.'
const EMPTY = []
const listeners = new Set()
// Items this page is sending. Any other item marked 'sending' was left by a
// page that closed mid-send, and that send is over.
const sendingHere = new Set()

const keyFor = (user) => PREFIX + user

function notify() {
  listeners.forEach((listener) => listener())
}

// The stored text, so the list is parsed again only when it changed.
function readText(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function itemsFrom(text) {
  try {
    const items = JSON.parse(text)
    return Array.isArray(items) ? items.filter((item) => typeof item?.id === 'string') : EMPTY
  } catch {
    return EMPTY
  }
}

const readItems = (user) => itemsFrom(readText(keyFor(user)))

// false when storage is full or blocked. An empty list leaves no key behind.
function writeItems(user, items) {
  if (items.length > 0) return writeJson(keyFor(user), items)
  removeKey(keyFor(user))
  return true
}

// crypto.randomUUID exists only in a secure context (HTTPS, localhost). The dev
// server opened by LAN IP over http has just getRandomValues, so there the same
// RFC 4122 version-4 id is built from 16 random bytes.
function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function track(id, status) {
  if (status === 'sending') sendingHere.add(id)
  else sendingHere.delete(id)
}

let snapshot = { key: null, text: null, items: EMPTY }

/** The signed-in user's workouts, oldest first: the same array until they change. */
export function getOutbox() {
  const user = getCurrentUser()
  if (!user) return EMPTY
  const key = keyFor(user)
  const text = readText(key)
  if (key !== snapshot.key || text !== snapshot.text) snapshot = { key, text, items: itemsFrom(text) }
  return snapshot.items
}

export function subscribeOutbox(listener) {
  listeners.add(listener)
  // Another tab of the app may change this user's outbox (or clear storage).
  const onStorage = (event) => {
    const user = getCurrentUser()
    if (event.key === null || (user && event.key === keyFor(user))) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useOutbox() {
  return useSyncExternalStore(subscribeOutbox, getOutbox)
}

/**
 * Keeps a workout for the signed-in user, with an id made on the phone and
 * the time Save was pressed. When the phone is full, that user's saved data
 * goes first (it can be loaded again; the workout can't). Throws
 * { code: 'storage_full' } if the workout still can't be kept.
 */
export function addToOutbox({ workout, planName, status = 'waiting', now = new Date() }) {
  const user = getCurrentUser()
  if (!user) throw new Error('Nobody is signed in to keep the workout for.')
  const item = {
    id: newId(),
    loggedAt: now.toISOString(),
    workout,
    planName,
    status,
    error: null,
  }
  const items = [...readItems(user), item]
  if (!writeItems(user, items)) {
    clearSavedData(user)
    if (!writeItems(user, items)) {
      throw Object.assign(new Error("This phone's storage is full, so the workout couldn't be kept."), {
        code: 'storage_full',
      })
    }
  }
  track(item.id, status)
  notify()
  return item
}

/** Changes one workout in `user`'s outbox (the signed-in user's by default). One that is gone stays gone. */
export function updateItem(id, changes, user = getCurrentUser()) {
  if (!user) return
  const items = readItems(user)
  if (!items.some((item) => item.id === id)) return
  writeItems(user, items.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  if ('status' in changes) track(id, changes.status)
  notify()
}

/** Takes one workout out of `user`'s outbox (the signed-in user's by default). */
export function removeItem(id, user = getCurrentUser()) {
  sendingHere.delete(id)
  if (!user) return
  const items = readItems(user)
  const rest = items.filter((item) => item.id !== id)
  if (rest.length === items.length) return
  writeItems(user, rest)
  notify()
}

// A send can't outlive the page that started it. So when someone signs in
// (which every app start does), their workouts left 'sending' by an earlier
// page are waiting again; the ones this page is still sending are left alone.
subscribeCurrentUser(() => {
  const user = getCurrentUser()
  if (user) {
    const items = readItems(user)
    const cutOff = (item) => item.status === 'sending' && !sendingHere.has(item.id)
    if (items.some(cutOff)) writeItems(user, items.map((item) => (cutOff(item) ? { ...item, status: 'waiting' } : item)))
  }
  notify()
})
