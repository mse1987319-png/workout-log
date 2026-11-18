// Generates the app icons in public/ from public/favicon.svg. Run it by hand
// when the logo changes (the PNGs are committed; it is not part of the build):
//
//   npx --yes @vite-pwa/assets-generator@2.0.0 --config pwa-assets.config.js
//
// The pinned version is not a dependency of the project.
export default {
  preset: {
    transparent: { sizes: [64, 192, 512] },
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: '#0f172a' } },
    apple: { sizes: [180], padding: 0.2, resizeOptions: { background: '#0f172a' } },
  },
  images: ['public/favicon.svg'],
}
