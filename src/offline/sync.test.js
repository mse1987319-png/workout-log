import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { backend } from '../test/fakeBackend'
import { ATHLETE, createFakeAuth, INSTRUCTOR, sessionFor } from '../test/fakeSupabase'
import { setCurrentUser } from './currentUser'
import { getDbVersion, markDbOlder } from './dbVersion'
import { readDraft, saveDraft } from './draft'
import { addToOutbox, getOutbox } from './outbox'
import { readSaved, saveData } from './savedData'
import { deleteItem, onWorkoutSent, retryItem, saveWorkout, startOutboxSync, syncOutbox } from './sync'

// A real supabase-js client on the fake REST backend; each test signs in with the fake auth.
vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const LOG_WORKOUT = '/rest/v1/rpc/log_workout'
const OUTBOX_KEY = `logify.outbox.v1.${ATHLETE.id}`
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const PLAN_NAME = 'Strength block'
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
const ROW = {
  id: 'b2c4e6a8-1d3f-4a5b-8c7d-9e0f1a2b3c4d',
  plan_id: 'plan-1',
  user_id: ATHLETE.id,
  title: 'Leg day',
  type: 'strength',
  duration_min: 60,
  activity: null,
  distance_km: null,
  notes: null,
  created_at: '2026-11-16T16:42:00+00:00',
}
// What log_workout answers when the plan was deleted while the workout waited.
const PLAN_GONE = {
  code: '23503',
  message: 'insert or update on table "workouts" violates foreign key constraint "workouts_plan_id_fkey"',
  details: 'Key (plan_id)=(plan-1) is not present in table "plans".',
  hint: null,
}
const SERVER_BUSY = { code: 'PGRST002', message: 'Could not query the database for the schema cache. Retrying.' }

const save = () => saveWorkout({ workout: WORKOUT, planName: PLAN_NAME })
const posts = () => backend.requests.filter((request) => request.method === 'POST' && request.path === LOG_WORKOUT)
const goOffline = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
// Lets every pending promise callback run (real timers only).
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
// A workout logged with no signal, waiting to be sent.
const logOffline = (title) => addToOutbox({ workout: { ...WORKOUT, title }, planName: PLAN_NAME })

// The next request reaches the backend now, but its reply waits for release().
function holdNextReply() {
  let release
  const released = new Promise((resolve) => {
    release = resolve
  })
  const answer = backend.fetch
  vi.spyOn(backend, 'fetch').mockImplementationOnce((input, init) => {
    const reply = answer(input, init)
    return released.then(() => reply)
  })
  return release
}

// Stopped and unsubscribed after each test, before its timers are restored.
const cleanups = []

beforeEach(() => {
  backend.reset()
  supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
  setCurrentUser(ATHLETE.id)
})

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('saving a workout', () => {
  it('saves a workout right away when online and leaves nothing in the outbox', async () => {
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const sent = vi.fn()
    cleanups.push(onWorkoutSent(sent))

    await expect(save()).resolves.toEqual({ saved: ROW })

    expect(posts()).toHaveLength(1)
    const [request] = posts()
    expect(sent).toHaveBeenCalledTimes(1)
    const [row, item] = sent.mock.calls[0]
    expect(row).toEqual(ROW)
    expect(request.body).toEqual({
      p_plan_id: 'plan-1',
      p_title: 'Leg day',
      p_type: 'strength',
      p_duration_min: 60,
      p_activity: null,
      p_distance_km: null,
      p_notes: null,
      p_sets: WORKOUT.sets,
      p_id: item.id,
      p_logged_at: item.loggedAt,
    })
    expect(request.body.p_id).toMatch(UUID)
    expect(new Date(request.body.p_logged_at).toISOString()).toBe(request.body.p_logged_at)
    expect(request.headers.get('Authorization')).toBe('Bearer test-access-token')
    expect(getOutbox()).toEqual([])
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull()
  })

  it('sends the other waiting workouts right after a save', async () => {
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    logOffline('Monday')

    await expect(save()).resolves.toEqual({ saved: ROW })

    // Nothing else starts a round here: the save getting through does.
    await vi.waitFor(() => expect(getOutbox()).toEqual([]))
    expect(posts().map((request) => request.body.p_title)).toEqual(['Leg day', 'Monday'])

    // The same when the phone was too full to keep the workout and sent it directly.
    logOffline('Tuesday')
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      const grows = value.length > (localStorage.getItem(key)?.length ?? 0)
      if (key.startsWith('logify.outbox.v1.') && grows) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
      return setItem.call(this, key, value)
    })

    await expect(save()).resolves.toEqual({ saved: ROW })

    await vi.waitFor(() => expect(getOutbox()).toEqual([]))
    expect(posts().map((request) => request.body.p_title)).toEqual(['Leg day', 'Monday', 'Leg day', 'Tuesday'])
    expect(posts()[2].body).not.toHaveProperty('p_id')
  })

  it('drops the unsaved form as soon as the outbox holds the workout', async () => {
    saveDraft({ planId: 'plan-1', title: 'Leg day', exercises: [] })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()

    const saving = save()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))

    // Still on its way: if the app closed now, the outbox would send it on the
    // next start, and a restored form would invite a second Save.
    expect(getOutbox()).toHaveLength(1)
    expect(readDraft()).toBeNull()
    release()
    await expect(saving).resolves.toEqual({ saved: ROW })
  })

  it('leaves the unsaved form alone while a workout the phone could not keep is sent directly', async () => {
    saveDraft({ planId: 'plan-1', title: 'Leg day', exercises: [] })
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key.startsWith('logify.outbox.v1.')) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
      return setItem.call(this, key, value)
    })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()

    const saving = save()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))

    // No copy on the phone: the form is all there is until the server answers.
    expect(readDraft()).toMatchObject({ title: 'Leg day' })
    release()
    await expect(saving).resolves.toEqual({ saved: ROW })
  })

  it('a failing sent listener does not fail the save or stop the round', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = new Error('This screen could not show the workout')
    const failing = vi.fn(() => {
      throw broken
    })
    const working = vi.fn()
    cleanups.push(onWorkoutSent(failing), onWorkoutSent(working))
    logOffline('Monday')
    logOffline('Tuesday')
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    // The save still succeeds, so the form doesn't invite a second Save.
    await expect(save()).resolves.toEqual({ saved: ROW })
    // And the round after it still sends both waiting workouts.
    await syncOutbox()

    expect(posts()).toHaveLength(3)
    expect(getOutbox()).toEqual([])
    expect(failing).toHaveBeenCalledTimes(3)
    expect(working).toHaveBeenCalledTimes(3)
    expect(consoleError).toHaveBeenCalledTimes(3)
    expect(consoleError).toHaveBeenCalledWith(broken)
  })

  it('keeps the workout when the network is down and sends the same workout in the next round', async () => {
    backend.networkDown('POST', LOG_WORKOUT)
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    const { kept } = await save()
    expect(getOutbox()).toEqual([kept])
    expect(kept).toMatchObject({ status: 'waiting', error: null, workout: WORKOUT, planName: PLAN_NAME })

    await syncOutbox()

    const [first, second] = posts()
    expect(posts()).toHaveLength(2)
    expect(first.body.p_id).toBe(kept.id)
    expect(second.body).toEqual(first.body)
    expect(getOutbox()).toEqual([])
  })

  it('keeps the workout without trying when the phone is offline', async () => {
    goOffline()

    const { kept } = await save()
    await syncOutbox()

    expect(backend.requests).toHaveLength(0)
    expect(kept).toMatchObject({ status: 'waiting', workout: WORKOUT, planName: PLAN_NAME })
    expect(getOutbox()).toEqual([kept])
  })

  it('stops waiting after 15 s and keeps the workout', async () => {
    vi.useFakeTimers()
    backend.hang('POST', LOG_WORKOUT)
    let result = null
    save().then((value) => {
      result = value
    })

    await vi.advanceTimersByTimeAsync(14999)
    expect(posts()).toHaveLength(1)
    expect(result).toBeNull()

    await vi.advanceTimersByTimeAsync(1)
    expect(getOutbox()).toEqual([expect.objectContaining({ status: 'sending', workout: WORKOUT })])
    expect(result).toEqual({ kept: getOutbox()[0] })
    // The send has the same limit of its own, so a dead connection can't hold it.
    expect(posts()[0].signal).toBeInstanceOf(AbortSignal)
  })

  it('drops the workout and throws when the server refuses it', async () => {
    backend.reply('POST', LOG_WORKOUT, 403, {
      code: '42501',
      message: 'new row violates row-level security policy for table "workouts"',
      details: null,
      hint: null,
    })

    await expect(save()).rejects.toMatchObject({ code: '42501', status: 403 })

    expect(posts()).toHaveLength(1)
    expect(getOutbox()).toEqual([])
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull()
  })

  it('does not send without a usable session', async () => {
    // The sign-in expired while offline: Supabase has no session yet.
    supabase.auth = createFakeAuth({ session: null })

    const { kept } = await save()
    await syncOutbox()

    expect(backend.requests).toHaveLength(0)
    expect(getOutbox()).toEqual([kept])
    expect(kept.status).toBe('waiting')

    // Once Supabase has the session again, the workout goes with it.
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    await syncOutbox()

    expect(posts()).toHaveLength(1)
    expect(posts()[0].headers.get('Authorization')).toBe('Bearer test-access-token')
    expect(getOutbox()).toEqual([])
  })

  it("never sends one person's workout with another person's session", async () => {
    const item = logOffline('Monday')
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })

    await syncOutbox()

    expect(backend.requests).toHaveLength(0)
    expect(getOutbox()).toEqual([item])
  })

  it("keeps the workout when Supabase can't tell whether there is a session", async () => {
    supabase.auth.getSession.mockRejectedValueOnce(new Error('Acquiring the auth lock timed out'))

    const { kept } = await save()

    expect(backend.requests).toHaveLength(0)
    expect(getOutbox()).toEqual([kept])
    expect(kept.status).toBe('waiting')
  })

  it('falls back to the old call on an older database and remembers it', async () => {
    backend.reply('POST', LOG_WORKOUT, 404, {
      code: 'PGRST202',
      message:
        'Could not find the function public.log_workout(p_activity, p_distance_km, p_duration_min, p_id, p_logged_at, p_notes, p_plan_id, p_sets, p_title, p_type) in the schema cache',
      details: null,
      hint: null,
    })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    await expect(save()).resolves.toEqual({ saved: ROW })

    const [first, second] = posts()
    expect(posts()).toHaveLength(2)
    expect(first.body).toMatchObject({ p_id: expect.any(String), p_logged_at: expect.any(String) })
    expect(second.body).not.toHaveProperty('p_id')
    expect(second.body).not.toHaveProperty('p_logged_at')
    expect(second.signal).toBeUndefined()
    expect(getDbVersion()).toBe(0)
    expect(getOutbox()).toEqual([])
  })

  it("falls back at once even when the phone can't remember the older database", async () => {
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'logify.dbVersion') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      return setItem.call(this, key, value)
    })
    backend.reply('POST', LOG_WORKOUT, 404, { code: 'PGRST202', message: 'Could not find the function', hint: null })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    await expect(save()).resolves.toEqual({ saved: ROW })

    // The repeat goes the old way without asking the stored version again.
    expect(posts().map((request) => 'p_id' in request.body)).toEqual([true, false])
    expect(getDbVersion()).toBeNull()
  })

  it("does not resend the old way with another user's session", async () => {
    const item = logOffline('Monday')
    backend.reply('POST', LOG_WORKOUT, 404, { code: 'PGRST202', message: 'Could not find the function', hint: null })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()
    const sending = syncOutbox()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))

    // Someone else's session arrives while the first answer is on its way.
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })
    release()
    await sending

    expect(posts()).toHaveLength(1)
    expect(getDbVersion()).toBe(0)
    expect(getOutbox()).toEqual([item])
  })

  it('on an older database the send is not cut off', async () => {
    vi.useFakeTimers()
    markDbOlder()
    backend.hang('POST', LOG_WORKOUT)
    let result = null
    save().then((value) => {
      result = value
    })

    await vi.advanceTimersByTimeAsync(15000)

    expect(posts()).toHaveLength(1)
    expect(posts()[0].signal).toBeUndefined()
    expect(posts()[0].body).not.toHaveProperty('p_id')
    expect(result).toEqual({ kept: expect.objectContaining({ workout: WORKOUT }) })
    // Still on its way: it settles whenever the server answers.
    expect(getOutbox()).toEqual([expect.objectContaining({ status: 'sending' })])
  })

  it("sends directly when the phone can't keep the workout, and says so offline", async () => {
    saveData('plans', ['mine'], 1000)
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key.startsWith('logify.outbox.v1.')) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
      return setItem.call(this, key, value)
    })
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    await expect(save()).resolves.toEqual({ saved: ROW })
    // Saved data went first, to make room; then it went the way it did before the outbox.
    expect(readSaved('plans')).toBeNull()
    expect(posts()).toHaveLength(1)
    expect(posts()[0].body).not.toHaveProperty('p_id')
    expect(getOutbox()).toEqual([])

    goOffline()
    await expect(save()).rejects.toMatchObject({ code: 'storage_full' })
    expect(posts()).toHaveLength(1)
    expect(getOutbox()).toEqual([])
  })
})

describe('a send that settles after the form stopped waiting', () => {
  // Saves with the reply held back past the form's 15 s; release() lets it through.
  async function saveAndStopWaiting() {
    vi.useFakeTimers()
    const release = holdNextReply()
    let result = null
    save().then((value) => {
      result = value
    })
    await vi.advanceTimersByTimeAsync(15000)
    expect(result).toEqual({ kept: expect.objectContaining({ status: 'sending' }) })
    return { kept: result.kept, release }
  }

  it('announces a workout sent after the form stopped waiting', async () => {
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const sent = vi.fn()
    cleanups.push(onWorkoutSent(sent))

    const { kept, release } = await saveAndStopWaiting()
    expect(sent).not.toHaveBeenCalled()
    release()

    await vi.waitFor(() => expect(getOutbox()).toEqual([]))
    expect(sent).toHaveBeenCalledTimes(1)
    expect(sent).toHaveBeenCalledWith(ROW, expect.objectContaining({ id: kept.id }))
    expect(posts()).toHaveLength(1)
  })

  it.each([
    ['waits again when the server could not take it yet', 503, SERVER_BUSY, { status: 'waiting', error: null }],
    [
      "keeps it as Couldn't send when the server refuses it",
      409,
      PLAN_GONE,
      { status: 'failed', error: { message: PLAN_GONE.message, code: '23503' } },
    ],
  ])('%s', async (_case, status, body, outcome) => {
    backend.reply('POST', LOG_WORKOUT, status, body)
    const sent = vi.fn()
    cleanups.push(onWorkoutSent(sent))

    const { kept, release } = await saveAndStopWaiting()
    release()

    await vi.waitFor(() => expect(getOutbox()).toEqual([{ ...kept, ...outcome }]))
    expect(sent).not.toHaveBeenCalled()
    expect(posts()).toHaveLength(1)
  })

  it('files a late answer under its owner when someone else signed in meanwhile', async () => {
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const sent = vi.fn()
    cleanups.push(onWorkoutSent(sent))
    const { release } = await saveAndStopWaiting()

    // A logs out and B logs in before the answer comes.
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })
    setCurrentUser(INSTRUCTOR.id)
    const theirs = logOffline('Theirs')
    release()

    await vi.waitFor(() => expect(localStorage.getItem(OUTBOX_KEY)).toBeNull())
    expect(getOutbox()).toEqual([theirs])
    expect(sent).not.toHaveBeenCalled()
  })
})

describe('sending the outbox', () => {
  it('sends waiting workouts in order, one at a time', async () => {
    const monday = logOffline('Monday')
    const tuesday = logOffline('Tuesday')
    const wednesday = logOffline('Wednesday')
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()

    const sending = syncOutbox()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))
    await settle()
    // The first is on its way; the others wait for its answer.
    expect(posts()).toHaveLength(1)
    expect(getOutbox().map((item) => item.status)).toEqual(['sending', 'waiting', 'waiting'])

    release()
    await sending

    expect(posts().map((request) => request.body.p_id)).toEqual([monday.id, tuesday.id, wednesday.id])
    expect(posts().map((request) => request.body.p_logged_at)).toEqual([
      monday.loggedAt,
      tuesday.loggedAt,
      wednesday.loggedAt,
    ])
    expect(getOutbox()).toEqual([])
  })

  it("marks a refused workout Couldn't send and goes on with the next", async () => {
    const gone = logOffline('Plan deleted')
    const next = logOffline('Still fine')
    backend.reply('POST', LOG_WORKOUT, 409, PLAN_GONE)
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    await syncOutbox()

    expect(posts().map((request) => request.body.p_id)).toEqual([gone.id, next.id])
    expect(getOutbox()).toEqual([
      { ...gone, status: 'failed', error: { message: PLAN_GONE.message, code: '23503' } },
    ])
  })

  it.each([
    ['a duplicate id', 409, { code: '23505', message: 'duplicate key value violates unique constraint "workouts_pkey"' }],
    ['a server error', 503, SERVER_BUSY],
    ['an expired sign-in', 401, { code: 'PGRST301', message: 'JWT expired' }],
    ['a sign-in the gateway rejects', 401, { message: 'Invalid JWT' }],
  ])('tries later after %s', async (_case, status, body) => {
    const monday = logOffline('Monday')
    const tuesday = logOffline('Tuesday')
    backend.reply('POST', LOG_WORKOUT, status, body)

    await syncOutbox()

    // One try, then the round ends: both wait for the next one, as they were.
    expect(posts()).toHaveLength(1)
    expect(getOutbox()).toEqual([monday, tuesday])
  })

  it("retryItem sends a Couldn't send workout again; deleteItem removes it", async () => {
    const monday = logOffline('Monday')
    const tuesday = logOffline('Tuesday')
    backend.reply('POST', LOG_WORKOUT, 409, PLAN_GONE)
    backend.reply('POST', LOG_WORKOUT, 409, PLAN_GONE)
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    await syncOutbox()
    expect(getOutbox().map((item) => item.status)).toEqual(['failed', 'failed'])

    retryItem(monday.id)

    await vi.waitFor(() => expect(getOutbox()).toEqual([expect.objectContaining({ id: tuesday.id })]))
    expect(posts()).toHaveLength(3)
    expect(posts()[2].body.p_id).toBe(monday.id)

    deleteItem(tuesday.id)

    expect(getOutbox()).toEqual([])
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull()
    expect(posts()).toHaveLength(3)
  })

  it('Try again leaves a workout that is being sent alone', async () => {
    logOffline('Monday')
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()
    const sending = syncOutbox()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))
    const [item] = getOutbox()

    retryItem(item.id)

    expect(getOutbox()).toEqual([item])
    expect(item.status).toBe('sending')
    release()
    await sending
    expect(posts()).toHaveLength(1)
    expect(getOutbox()).toEqual([])
  })

  it('runs one round at a time', async () => {
    const monday = logOffline('Monday')
    const tuesday = logOffline('Tuesday')
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()

    const first = syncOutbox()
    const second = syncOutbox()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))
    await settle()
    expect(posts()).toHaveLength(1)

    release()
    await Promise.all([first, second])

    expect(posts().map((request) => request.body.p_id)).toEqual([monday.id, tuesday.id])
    expect(getOutbox()).toEqual([])
  })

  it("keeps each user's outbox apart", async () => {
    const offline = goOffline()
    const { kept } = await save()
    offline.mockRestore()

    // A logs out and B logs in on the same phone: none of A's workouts.
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })
    setCurrentUser(INSTRUCTOR.id)
    expect(getOutbox()).toEqual([])
    await syncOutbox()
    expect(backend.requests).toHaveLength(0)

    // A logs in again: the workout is there and is sent.
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    setCurrentUser(ATHLETE.id)
    expect(getOutbox()).toEqual([kept])
    await syncOutbox()

    expect(posts()).toHaveLength(1)
    expect(posts()[0].body.p_id).toBe(kept.id)
    expect(getOutbox()).toEqual([])
  })

  it('files a send that finishes after someone else signed in under its owner', async () => {
    const monday = logOffline('Monday')
    const tuesday = logOffline('Tuesday')
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    const release = holdNextReply()
    const sent = vi.fn()
    cleanups.push(onWorkoutSent(sent))
    const sending = syncOutbox()
    await vi.waitFor(() => expect(posts()).toHaveLength(1))

    // A logs out and B logs in while A's first workout is on its way.
    supabase.auth = createFakeAuth({ session: sessionFor(INSTRUCTOR) })
    setCurrentUser(INSTRUCTOR.id)
    const theirs = logOffline('Theirs')
    release()
    await sending

    // A's round stopped there: B's outbox is untouched and B isn't told about A's workout.
    expect(posts()).toHaveLength(1)
    expect(posts()[0].body.p_id).toBe(monday.id)
    expect(getOutbox()).toEqual([theirs])
    expect(sent).not.toHaveBeenCalled()

    supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })
    setCurrentUser(ATHLETE.id)
    expect(getOutbox()).toEqual([tuesday])
  })

  it('a workout left Sending by a closed app is waiting again after a reload', async () => {
    setCurrentUser(null)
    const item = {
      id: 'c3d5f7b9-2e4a-4b6c-9d8e-0f1a2b3c4d5e',
      loggedAt: '2026-11-16T16:42:00.000Z',
      workout: WORKOUT,
      planName: PLAN_NAME,
      status: 'sending',
      error: null,
    }
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([item]))
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    // The app starts again and learns who is signed in.
    setCurrentUser(ATHLETE.id)
    expect(getOutbox()).toEqual([{ ...item, status: 'waiting' }])

    await syncOutbox()
    await syncOutbox()

    expect(posts()).toHaveLength(1)
    expect(posts()[0].body).toMatchObject({ p_id: item.id, p_logged_at: item.loggedAt })
    expect(getOutbox()).toEqual([])
  })
})

describe('when the outbox is sent', () => {
  it('sends when the connection comes back', async () => {
    const offline = goOffline()
    const { kept } = await save()
    cleanups.push(startOutboxSync())
    await settle()
    expect(backend.requests).toHaveLength(0)

    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    offline.mockRestore()
    window.dispatchEvent(new Event('online'))

    await vi.waitFor(() => expect(getOutbox()).toEqual([]))
    expect(posts()).toHaveLength(1)
    expect(posts()[0].body.p_id).toBe(kept.id)
  })

  it('retries every 30 s while something waits', async () => {
    vi.useFakeTimers()
    const item = logOffline('Monday')
    backend.networkDown('POST', LOG_WORKOUT)
    backend.reply('POST', LOG_WORKOUT, 200, ROW)

    cleanups.push(startOutboxSync())
    await vi.advanceTimersByTimeAsync(0)
    expect(posts()).toHaveLength(1)
    expect(getOutbox()).toEqual([item])

    await vi.advanceTimersByTimeAsync(29999)
    expect(posts()).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(posts()).toHaveLength(2)
    expect(getOutbox()).toEqual([])

    // Nothing waits any more, so nothing more is tried.
    await vi.advanceTimersByTimeAsync(60000)
    expect(posts()).toHaveLength(2)
  })

  it('pauses the retries in the background and sends when the app is visible again', async () => {
    vi.useFakeTimers()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    logOffline('Monday')
    backend.networkDown('POST', LOG_WORKOUT)
    backend.reply('POST', LOG_WORKOUT, 200, ROW)
    cleanups.push(startOutboxSync())
    await vi.advanceTimersByTimeAsync(0)
    expect(posts()).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(60000)
    expect(posts()).toHaveLength(1)

    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)

    expect(posts()).toHaveLength(2)
    expect(getOutbox()).toEqual([])
  })

  it('stops listening when stopped', async () => {
    const stop = startOutboxSync()
    await settle()
    stop()
    logOffline('Monday')

    window.dispatchEvent(new Event('online'))
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()

    expect(backend.requests).toHaveLength(0)
  })
})
