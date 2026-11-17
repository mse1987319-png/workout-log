// Sending the outbox (spec §4 and §7). Each workout goes to log_workout with
// the id made on the phone, so the database saves it, and the instructor is
// emailed, exactly once however often a send is repeated. Workouts go in
// order, one at a time, and only ever with their owner's own session.
import { createWorkout } from '../api/workouts'
import { isNetworkError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { getCurrentUser, subscribeCurrentUser } from './currentUser'
import { markDbOlder, supportsExactlyOnce } from './dbVersion'
import { isOnline } from './network'
import { addToOutbox, getOutbox, removeItem, updateItem } from './outbox'

// How long the form waits for a send (and how long an exactly-once send may take).
export const SEND_LIMIT_MS = 15000
// How often waiting workouts are tried again while the app is open.
export const RETRY_EVERY_MS = 30000

// Refusals that can pass later: an expired or rejected sign-in, and a
// duplicate id (two sends raced; the next try finds the saved workout).
const TRY_LATER_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303', '23505'])
const RETRY = { outcome: 'retry' }
const TOO_SLOW = Symbol('too slow')

const sentListeners = new Set()
// The round of sends in progress, { user, promise }, or null.
let round = null

// Someone else signing in, or out, ends the round after its current send.
subscribeCurrentUser(() => {
  round = null
})

function triesLater(error) {
  return isNetworkError(error) || error?.status >= 500 || error?.status === 401 || TRY_LATER_CODES.has(error?.code)
}

// Supabase must hold this person's own session: without one supabase-js would
// send the anon key, and with someone else's the workout would become theirs.
async function hasSessionOf(user) {
  try {
    const { data } = await supabase.auth.getSession()
    return Boolean(user) && data.session?.user?.id === user
  } catch {
    return false
  }
}

// One call to log_workout, as an outcome. Never throws.
async function attempt(params) {
  try {
    return { outcome: 'sent', row: await createWorkout(params) }
  } catch (error) {
    return triesLater(error) ? RETRY : { outcome: 'failed', error }
  }
}

/** Sends one of the signed-in user's workouts. Never throws. */
export async function sendItem(item) {
  const owner = getCurrentUser()
  if (!(await hasSessionOf(owner))) return RETRY
  // The phone's id and time go only to a database that knows them.
  if (!supportsExactlyOnce()) return attempt(item.workout)
  const result = await attempt({
    ...item.workout,
    id: item.id,
    loggedAt: item.loggedAt,
    signal: AbortSignal.timeout(SEND_LIMIT_MS),
  })
  if (result.error?.code !== 'PGRST202') return result
  // No v5 log_workout after all (rolled back, or PostgREST's schema cache is
  // behind): remember that, and send this one the old way at once. It doesn't
  // ask supportsExactlyOnce() again, so a failed write can't make it loop. A
  // whole round trip has passed, so the owner's session is checked again.
  markDbOlder()
  if (!(await hasSessionOf(owner))) return RETRY
  return attempt(item.workout)
}

// A screen's failing listener must not undo a save (the form would invite a
// second Save: a duplicate workout and email) or end a round.
function announce(row, item) {
  sentListeners.forEach((listener) => {
    try {
      listener(row, item)
    } catch (error) {
      console.error(error)
    }
  })
}

// What a send's outcome does to its owner's outbox. Only the person signed in
// hears about a sent workout: if someone else signed in meanwhile, it isn't
// theirs to show.
function record(owner, item, result) {
  if (result.outcome === 'sent') {
    removeItem(item.id, owner)
    if (getCurrentUser() === owner) announce(result.row, item)
  } else if (result.outcome === 'retry') {
    updateItem(item.id, { status: 'waiting' }, owner)
  } else {
    const { message = '', code = '' } = result.error ?? {}
    updateItem(item.id, { status: 'failed', error: { message, code } }, owner)
  }
}

/** Sends the signed-in user's waiting workouts, oldest first, one at a time. */
export function syncOutbox() {
  const user = getCurrentUser()
  if (!user || !isOnline()) return Promise.resolve()
  if (round?.user !== user) {
    const current = { user }
    // It starts once `round` is set, so a call made meanwhile joins it.
    current.promise = Promise.resolve()
      .then(() => sendWaiting(current))
      .finally(() => {
        if (round === current) round = null
      })
    round = current
  }
  return round.promise
}

async function sendWaiting(current) {
  // Until nothing waits, a send has to wait for later, or someone else signs in.
  // Each workout is tried at most once a round, so the round ends even if a
  // status could not be written.
  const tried = new Set()
  while (round === current) {
    const item = getOutbox().find((entry) => entry.status === 'waiting' && !tried.has(entry.id))
    if (!item) return
    tried.add(item.id)
    updateItem(item.id, { status: 'sending' }, current.user)
    const result = await sendItem(item)
    record(current.user, item, result)
    if (result.outcome === 'retry') return
  }
}

// The save got through, so the server can be reached: the other waiting
// workouts go now rather than at the next 30 s tick (spec §4).
function saved(row) {
  void syncOutbox()
  return { saved: row }
}

// The promise's value, or TOO_SLOW once `ms` have passed.
function within(ms, promise) {
  let timer
  const limit = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TOO_SLOW), ms)
  })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

/**
 * The Log workout form's Save. The workout goes into the outbox first and,
 * online, straight on to the server. Resolves { saved: row } once the server
 * has it, or { kept: item } while it waits on the phone (offline, no signal,
 * or no answer within SEND_LIMIT_MS). Throws when the server refuses it (it
 * isn't kept, so the form can show why) or when the phone can't keep it offline.
 */
export async function saveWorkout({ workout, planName }) {
  const owner = getCurrentUser()
  const online = isOnline()
  let item
  try {
    item = addToOutbox({ workout, planName, status: online ? 'sending' : 'waiting' })
  } catch (error) {
    // The phone can't keep it: online it goes the way it did before the
    // outbox (no id, so not exactly-once); offline the form has to say so.
    if (error?.code !== 'storage_full' || !online) throw error
    return saved(await createWorkout(workout))
  }
  if (!online) return { kept: item }

  const sending = sendItem(item)
  const result = await within(SEND_LIMIT_MS, sending)
  if (result === TOO_SLOW) {
    // The form stops waiting; the send goes on and settles in the outbox.
    sending.then((late) => record(owner, item, late))
    return { kept: item }
  }
  if (result.outcome === 'failed') {
    removeItem(item.id, owner)
    throw result.error
  }
  record(owner, item, result)
  return result.outcome === 'sent' ? saved(result.row) : { kept: { ...item, status: 'waiting' } }
}

/** Try again, for a workout that couldn't be sent. */
export function retryItem(id) {
  if (getOutbox().find((item) => item.id === id)?.status !== 'failed') return
  updateItem(id, { status: 'waiting', error: null })
  syncOutbox()
}

/** Deletes a workout that was never sent (My plans asks first). */
export function deleteItem(id) {
  removeItem(id)
}

/** listener(row, item) hears about each of the signed-in user's workouts the server took. */
export function onWorkoutSent(listener) {
  sentListeners.add(listener)
  return () => {
    sentListeners.delete(listener)
  }
}

// Only a page the browser reports as hidden counts as hidden.
const pageVisible = () => document.visibilityState !== 'hidden'

/**
 * Sends the outbox now, when the connection comes back or the app is in view
 * again, and every RETRY_EVERY_MS while a workout waits and the app is in
 * view. Returns the function that stops all of it.
 */
export function startOutboxSync() {
  const sync = () => {
    syncOutbox()
  }
  const onVisibilityChange = () => {
    if (pageVisible()) syncOutbox()
  }
  const timer = setInterval(() => {
    if (pageVisible() && getOutbox().some((item) => item.status === 'waiting')) syncOutbox()
  }, RETRY_EVERY_MS)
  window.addEventListener('online', sync)
  document.addEventListener('visibilitychange', onVisibilityChange)
  syncOutbox()
  return () => {
    clearInterval(timer)
    window.removeEventListener('online', sync)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
