import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import { lastReport, previewReport, sendReport } from './reports'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

describe('reports API', () => {
  beforeEach(() => {
    backend.reset()
  })

  it("previews the last 7 days' numbers from report_stats", async () => {
    const stats = { days: 7, workouts: 3, summary: 'Nov 6 – Nov 12: 3 workouts (2 strength, 1 other), 140 min.' }
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, stats)

    await expect(previewReport()).resolves.toEqual(stats)
    expect(backend.requests[0].body).toEqual({ p_days: 7 })
  })

  it('sends a report through send_report and returns the saved row', async () => {
    const saved = { id: 'r1', summary: 'Nov 6 – Nov 12: …', created_at: '2026-11-12T10:00:00+00:00' }
    backend.reply('POST', '/rest/v1/rpc/send_report', 200, saved)

    await expect(sendReport()).resolves.toEqual(saved)
    expect(backend.requests[0].body).toEqual({})
  })

  it('rejects with the database message when a report was sent moments ago', async () => {
    backend.reply('POST', '/rest/v1/rpc/send_report', 400, {
      code: 'P0001',
      message: 'You sent a report a few minutes ago. Wait a little before sending another.',
      details: null,
      hint: null,
    })

    await expect(sendReport()).rejects.toMatchObject({ code: 'P0001' })
  })

  it('finds the most recent report, or none', async () => {
    backend.reply('GET', '/rest/v1/reports', 200, [{ created_at: '2026-11-10T18:00:00+00:00', summary: 'x' }])
    await expect(lastReport()).resolves.toEqual({ created_at: '2026-11-10T18:00:00+00:00', summary: 'x' })
    const [request] = backend.requests
    expect(request.query.get('select')).toBe('created_at,summary')
    expect(request.query.get('order')).toBe('created_at.desc')
    expect(request.query.get('limit')).toBe('1')

    backend.reset()
    backend.reply('GET', '/rest/v1/reports', 200, [])
    await expect(lastReport()).resolves.toBeNull()
  })
})
