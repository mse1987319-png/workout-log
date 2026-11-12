import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backend } from '../test/fakeBackend'
import NewPlanPage from './NewPlanPage'

vi.mock('../lib/supabase', async () => {
  const { createTestClient } = await import('../test/fakeBackend')
  return { supabase: createTestClient(), configError: null }
})

function savedPlan(overrides) {
  return {
    id: 'plan-3',
    name: 'Strength block',
    goal: null,
    created_at: '2026-11-11T09:00:00+00:00',
    ...overrides,
  }
}

function renderNewPlan() {
  render(
    <MemoryRouter initialEntries={['/plans/new']}>
      <Routes>
        <Route path="/plans/new" element={<NewPlanPage />} />
        <Route path="/" element={<p>my plans page</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const posts = () => backend.requests.filter((request) => request.method === 'POST' && request.path === '/rest/v1/plans')

describe('NewPlanPage', () => {
  beforeEach(() => {
    backend.reset()
  })

  it('shows the plan form, with a way back to My plans', () => {
    renderNewPlan()

    expect(screen.getByRole('heading', { level: 1, name: 'New plan' })).toBeInTheDocument()
    expect(screen.getByLabelText('Plan name')).toBeInTheDocument()
    expect(screen.getByLabelText('Goal (optional)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to My plans/ })).toHaveAttribute('href', '/')
  })

  it('creates a plan, confirms it and offers the next steps', async () => {
    backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ goal: 'Squat 100 kg' }))
    const user = renderNewPlan()

    await user.type(screen.getByLabelText('Plan name'), ' Strength block ')
    await user.type(screen.getByLabelText('Goal (optional)'), 'Squat 100 kg')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))

    expect(await screen.findByText('Plan created: Strength block.')).toBeInTheDocument()
    expect(posts()[0].body).toEqual({ name: 'Strength block', goal: 'Squat 100 kg' })
    expect(screen.getByRole('link', { name: 'Log a workout under it' })).toHaveAttribute('href', '/log?plan=plan-3')
    expect(screen.getByRole('link', { name: 'Go to My plans' })).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('Plan name')).toHaveValue('')
  })

  it('stores a blank goal as no goal', async () => {
    backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ name: '5K plan' }))
    const user = renderNewPlan()

    await user.type(screen.getByLabelText('Plan name'), '5K plan')
    await user.type(screen.getByLabelText('Goal (optional)'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))

    await screen.findByText('Plan created: 5K plan.')
    expect(posts()[0].body).toEqual({ name: '5K plan', goal: null })
  })

  it('needs a plan name', async () => {
    const user = renderNewPlan()

    await user.type(screen.getByLabelText('Plan name'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a plan name.')
    expect(posts()).toHaveLength(0)
  })

  it('shows Creating… while the plan is saved', async () => {
    backend.hang('POST', '/rest/v1/plans')
    const user = renderNewPlan()

    await user.type(screen.getByLabelText('Plan name'), '5K plan')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
  })

  it('explains a failed save and retries it', async () => {
    backend.networkDown('POST', '/rest/v1/plans')
    backend.reply('POST', '/rest/v1/plans', 201, savedPlan({ name: '5K plan' }))
    const user = renderNewPlan()

    await user.type(screen.getByLabelText('Plan name'), '5K plan')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Plan created: 5K plan.')).toBeInTheDocument()
  })
})
