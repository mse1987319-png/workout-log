import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getRules } from '../lib/recommendations'
import Suggestions from './Suggestions'

const ITEMS = [
  {
    key: 'back',
    kind: 'back',
    title: 'Pick up where you left off.',
    because: 'Your last workout was 9 days ago (Nov 3).',
    link: '/log',
  },
  {
    key: 'add:squat',
    kind: 'add',
    title: 'Squat: add 2.5 kg next time (102.5 kg).',
    because: 'You did 3 × 5 @ 100 kg in each of your last two sessions.',
  },
]

function renderSuggestions(items) {
  render(
    <MemoryRouter>
      <Suggestions items={items} />
    </MemoryRouter>,
  )
}

describe('Suggestions', () => {
  it('lists each suggestion with its reason', () => {
    renderSuggestions(ITEMS)

    const items = within(screen.getByRole('list', { name: 'Suggestions' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[1]).toHaveTextContent('Squat: add 2.5 kg next time (102.5 kg).')
    expect(items[1]).toHaveTextContent('You did 3 × 5 @ 100 kg in each of your last two sessions.')
  })

  it('links to the workout form when the suggestion is to log one', () => {
    renderSuggestions(ITEMS)

    expect(screen.getByRole('link', { name: 'Log a workout' })).toHaveAttribute('href', '/log')
  })

  it('can be shown read-only under another title, for an instructor', () => {
    render(
      <MemoryRouter>
        <Suggestions items={ITEMS} title="Suggestions for this athlete" readOnly />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Suggestions for this athlete' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Suggestions for this athlete' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log a workout' })).not.toBeInTheDocument()
  })

  it('says when there is nothing to suggest', () => {
    renderSuggestions([])

    expect(
      screen.getByText('Nothing to suggest right now: suggestions appear when one of the rules below applies.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Suggestions' })).not.toBeInTheDocument()
  })

  it('explains every rule', () => {
    renderSuggestions([])

    const rules = within(screen.getByRole('list', { name: 'How suggestions work' })).getAllByRole('listitem')
    expect(rules.map((rule) => rule.textContent)).toEqual(getRules().map((rule) => rule.text))
  })
})
