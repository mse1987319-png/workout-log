import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The install prompt and the "dismissed" flag are module state, so each test
// loads a fresh copy of the card and its prompt listener.
async function renderCard() {
  vi.resetModules()
  const { listenForInstallPrompt } = await import('../pwa/installPrompt')
  const { default: InstallCard } = await import('./InstallCard')
  listenForInstallPrompt()
  const { container } = render(<InstallCard />)
  return container
}

function offerInstall() {
  const prompt = vi.fn()
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return { prompt, event }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InstallCard', () => {
  it("offers Install when the browser allows it, and shows the browser's prompt", async () => {
    await renderCard()
    expect(screen.queryByText('Install Logify')).not.toBeInTheDocument()

    const { prompt, event } = offerInstall()
    expect(event.defaultPrevented).toBe(true)
    expect(await screen.findByText('Install Logify')).toBeInTheDocument()
    expect(screen.getByText('It opens like an app and works without signal.')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Install' }))
    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('Not now hides it for good', async () => {
    const user = userEvent.setup()
    await renderCard()
    offerInstall()

    await user.click(await screen.findByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Install Logify')).not.toBeInTheDocument()
    expect(localStorage.getItem('logify.installCard.dismissed')).toBe('1')

    // Next visit: the browser offers it again, the card stays hidden.
    await renderCard()
    offerInstall()
    expect(screen.queryByText('Install Logify')).not.toBeInTheDocument()
  })

  it('explains Add to Home Screen on iPhone', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    )
    const user = userEvent.setup()
    await renderCard()

    expect(screen.getByText('Install Logify')).toBeInTheDocument()
    expect(
      screen.getByText('On iPhone: tap Share, then Add to Home Screen.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByText('Install Logify')).not.toBeInTheDocument()
    expect(localStorage.getItem('logify.installCard.dismissed')).toBe('1')
  })

  it('shows nothing once installed', async () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    await renderCard()
    offerInstall()

    expect(screen.queryByText('Install Logify')).not.toBeInTheDocument()
  })
})
