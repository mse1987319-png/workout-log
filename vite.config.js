import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    // The form tests type a lot; on a busy machine 5 s (the default) is tight.
    testTimeout: 15000,
    // Tests must never reach the real Supabase project: blank out the
    // connection values that Vite would otherwise load from .env.local.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
})
