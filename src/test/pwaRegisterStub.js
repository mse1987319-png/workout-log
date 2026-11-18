// Stands in for vite-plugin-pwa's `virtual:pwa-register/react` in the tests
// (see the alias in vite.config.js): there is no service worker under jsdom.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }
}
