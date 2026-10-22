import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const YEAR = 60 * 60 * 24 * 365

export default defineConfig(() => ({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // enregistré manuellement dans main.js
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Banderas — Le quiz des 197 drapeaux',
        short_name: 'Banderas',
        description: 'Apprenez les drapeaux et capitales des 197 pays du monde.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Coquille de l'application + GeoJSON de la carte : disponibles hors ligne
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Drapeaux : immuables, on les garde longtemps
            urlPattern: ({ url }) => url.origin === 'https://flagcdn.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'flags',
              expiration: { maxEntries: 800, maxAgeSeconds: YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Avatars (Google, DiceBear, ui-avatars)
            urlPattern: ({ url }) =>
              ['lh3.googleusercontent.com', 'api.dicebear.com', 'ui-avatars.com'].includes(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'avatars',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    // Firebase est déjà isolé dans un chunk chargé à la demande
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
  },
}))
