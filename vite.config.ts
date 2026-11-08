import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Système solaire',
        short_name: 'Système solaire',
        lang: 'fr',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#000000',
        theme_color: '#000000',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Les textures (plusieurs dizaines de Mo) ne sont jamais précachées :
        // une tablette en niveau « low » ne télécharge que son niveau.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['textures/**'],
        runtimeCaching: [
          {
            urlPattern: /\/textures\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'systeme-solaire-textures-v1',
              // Les images WebGL sont chargées en mode CORS (en-tête Origin) alors que le préchargement
              // est une requête sans Origin : sans cela, `Vary: Origin` fait rater le cache hors ligne.
              matchOptions: { ignoreVary: true },
              expiration: { maxEntries: 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
