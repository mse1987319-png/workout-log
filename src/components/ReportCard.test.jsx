import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import ReportCard from './ReportCard'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

const STATS = {
  days: 7,
  workouts: 4,
  summary: 'Nov 6 – Nov 12: 4 workouts (3 strength, 1 other), 215 min, 42 sets. Heaviest: Squat 110 kg.',
}

function renderCard() {
  render(<ReportCard />)
  return userEvent.setup()
}

describe('ReportCard', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the Loading state while the preview loads', () => {
    backend.hang('POST', '/rest/v1/rpc/report_stats')
    backend.hang('GET', '/rest/v1/reports')
    renderCard()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your report…')
  })

  it('previews the report and says when the last one was sent', async () => {
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, STATS)
    backend.reply('GET', '/rest/v1/reports', 200, [{ created_at: '2026-11-10T18:00:00+00:00', summary: 'old' }])
    renderCard()

    expect(await screen.findByText(STATS.summary)).toBeInTheDocument()
    expect(screen.getByText(/^Last sent: .+\.$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send report to instructor' })).toBeEnabled()
  })

  it('says when no report has been sent yet', async () => {
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, STATS)
    backend.reply('GET', '/rest/v1/reports', 200, [])
    renderCard()

    expect(await screen.findByText("You haven't sent a report yet.")).toBeInTheDocument()
  })

  it('sends the report and confirms it', async () => {
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, STATS)
    backend.reply('GET', '/rest/v1/reports', 200, [])
    backend.reply('POST', '/rest/v1/rpc/send_report', 200, {
      id: 'r1',
      summary: STATS.summary,
      created_at: new Date().toISOString(),
    })
    const user = renderCard()

    await user.click(await screen.findByRole('button', { name: 'Send report to instructor' }))

    expect(await screen.findByText('Report sent. Your instructor gets it by email.')).toBeInTheDocument()
    expect(screen.getByText(/^Last sent: .+\.$/)).toBeInTheDocument()
    expect(backend.requests.filter((r) => r.path === '/rest/v1/rpc/send_report')).toHaveLength(1)
  })

  it('shows Sending… while the report is being sent', async () => {
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, STATS)
    backend.reply('GET', '/rest/v1/reports', 200, [])
    backend.hang('POST', '/rest/v1/rpc/send_report')
    const user = renderCard()

    await user.click(await screen.findByRole('button', { name: 'Send report to instructor' }))

    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
  })

  it('explains a refused report and lets the user try again', async () => {
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, STATS)
    backend.reply('GET', '/rest/v1/reports', 200, [])
    backend.reply('POST', '/rest/v1/rpc/send_report', 400, {
      code: 'P0001',
      message: 'You sent a report a few minutes ago. Wait a little before sending another.',
      details: null,
      hint: null,
    })
    backend.reply('POST', '/rest/v1/rpc/send_report', 200, { id: 'r2', summary: STATS.summary, created_at: new Date().toISOString() })
    const user = renderCard()

    await user.click(await screen.findByRole('button', { name: 'Send report to instructor' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You sent a report a few minutes ago.')

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Report sent. Your instructor gets it by email.')).toBeInTheDocument()
  })

  it('does not offer to send an empty week', async () => {
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, { days: 7, workouts: 0, summary: 'Nov 6 – Nov 12: no workouts logged.' })
    backend.reply('GET', '/rest/v1/reports', 200, [])
    renderCard()

    expect(await screen.findByText('Nov 6 – Nov 12: no workouts logged.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send report to instructor' })).toBeDisabled()
    expect(screen.getByText('Log a workout first: the report covers the last 7 days.')).toBeInTheDocument()
  })

  it('shows the Error state when the preview fails, and retries', async () => {
    backend.networkDown('POST', '/rest/v1/rpc/report_stats')
    backend.reply('POST', '/rest/v1/rpc/report_stats', 200, STATS)
    backend.reply('GET', '/rest/v1/reports', 200, [])
    const user = renderCard()

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(STATS.summary)).toBeInTheDocument()
  })
})
