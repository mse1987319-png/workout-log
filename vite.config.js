import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // The installable app: a manifest plus a service worker that keeps the
    // app's own files on the phone (so it opens offline). Dev mode stays off:
    // `npm run dev` runs without a service worker.
    VitePWA({
      // A new version waits until the person taps "Update" (useUpdateReady).
      registerType: 'prompt',
      // src/pwa/serviceWorker.js registers it.
      injectRegister: false,
      useCredentials: true,
      includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'Logify',
        short_name: 'Logify',
        description:
          'Logify: registruokite jėgos ir kardio treniruotes pagal savo planus. Jūsų treneris el. paštu gauna pranešimą apie kiekvieną naują treniruotę.',
        lang: 'lt',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f766e',
        background_color: '#f5f6f8',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Įrašyti treniruotę',
            url: '/log',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Pažanga',
            url: '/progress',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // The first service worker takes over the open page at once, so the
        // very first session after install already works offline. An update
        // still waits for "Update": skipWaiting stays off (registerType 'prompt').
        clientsClaim: true,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own files: they change less often than the app
        // (browsers keep them cached between deploys) and no file grows past
        // Vite's 500 kB warning.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /[\\/]node_modules[\\/]@supabase[\\/]/ },
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
  // Unit tests (Vitest): `npm test`
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:5173/' } },
    setupFiles: ['./src/test/setup.js'],
    // There is no service worker under jsdom: the registration module is a stub.
    alias: [
      {
        find: 'virtual:pwa-register/react',
        replacement: fileURLToPath(new URL('./src/test/pwaRegisterStub.js', import.meta.url)),
      },
    ],
    // The form tests type a lot; on a busy machine 5 s (the default) is tight.
    testTimeout: 15000,
    // Tests must never reach the real Supabase project: blank out the
    // connection values that Vite would otherwise load from .env.local.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
})
