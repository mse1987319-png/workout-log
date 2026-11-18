import { useSyncExternalStore } from 'react'

// The browser's "install this app" offer (Chrome and Android), kept until the
// person taps Install. iPhones have no such offer, see isIos().
let deferredPrompt = null
const listeners = new Set()

function setPrompt(event) {
  deferredPrompt = event
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Call once at startup: the offer can arrive before any screen is shown.
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Hold the browser's own banner back; the install card shows it instead.
    event.preventDefault()
    setPrompt(event)
  })
  window.addEventListener('appinstalled', () => setPrompt(null))
}

export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt)

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    // A prompt can be used only once, whatever the answer.
    setPrompt(null)
  }

  return { canInstall: prompt !== null, install }
}

// Opened from the home screen icon rather than in a browser tab.
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
}

// iPadOS 13+ reports itself as a Mac, with a touch screen.
export function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
