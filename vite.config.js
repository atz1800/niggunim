import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/niggunim/',
  build: {
    // Firestore + Auth לבדם ~600KB (לא דחוס). הם בקובץ נפרד ונשמרים במטמון
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      output: {
        // Firebase בקובץ נפרד — משתנה לעיתים רחוקות, נשאר במטמון בין עדכוני האפליקציה
        codeSplitting: {
          groups: [
            // Storage נטען רק במסכי הוספה/פירוט (lazy) ולכן לא נכלל כאן
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/](?!storage)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'יומן הניגונים שלי',
        short_name: 'ניגונים',
        description: 'שמור את הניגונים, האקורדים והסיפורים שמלווים אותך בדרך',
        theme_color: '#e8c547',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/niggunim/',
        start_url: '/niggunim/',
        dir: 'rtl',
        lang: 'he',
        icons: [
          { src: '/niggunim/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/niggunim/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/niggunim/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/niggunim/index.html',
        navigateFallbackDenylist: [/^\/__/],
        globPatterns: ['**/*.{js,css,html,svg,ico}', 'icon-*.png', 'apple-touch-icon.png'],
        runtimeCaching: [
          {
            // Firebase Storage audio — cache-first, 30 ימים.
            // rangeRequests: נגני אודיו (במיוחד Safari) מבקשים טווחי בתים — חובה לתמוך.
            // רק תשובות 200 נשמרות: תשובות opaque/206 במטמון שוברות ניגון ב-iOS.
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
            },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
