import { describe, expect, it } from 'vitest'
import { setCurrentUser } from './currentUser'
import { clearDraft, readDraft, saveDraft } from './draft'
import { keysStartingWith, readJson } from './storage'

const FIELDS = {
  planId: 'plan-1',
  title: 'Leg day',
  type: 'strength',
  duration: '60',
  exercises: [{ key: 'draft-1', name: 'Squat', lookup: 'Squat', sets: [{ key: 'draft-2', reps: '5', weight: '100' }] }],
  activity: '',
  distance: '',
  notes: 'Felt heavy',
}

describe('the unsaved workout draft', () => {
  it('keeps the draft per user', () => {
    setCurrentUser('user-1')
    saveDraft(FIELDS)
    expect(readJson('logify.draft.v1.user-1')).toEqual({ ...FIELDS, savedAt: expect.any(Number) })
    expect(readDraft()).toEqual({ ...FIELDS, savedAt: expect.any(Number) })

    setCurrentUser('user-2')
    expect(readDraft()).toBeNull()
    saveDraft({ ...FIELDS, title: 'Run' })

    setCurrentUser('user-1')
    expect(readDraft().title).toBe('Leg day')
  })

  it('does nothing without a signed-in user', () => {
    saveDraft(FIELDS)
    clearDraft()

    expect(readDraft()).toBeNull()
    expect(keysStartingWith('logify.draft.')).toEqual([])
  })

  it('clearDraft removes it', () => {
    setCurrentUser('user-1')
    saveDraft(FIELDS)
    setCurrentUser('user-2')
    saveDraft(FIELDS)

    clearDraft('user-1')
    expect(readJson('logify.draft.v1.user-1')).toBeNull()
    expect(readDraft()).not.toBeNull()

    clearDraft()
    expect(readDraft()).toBeNull()
  })
})
