import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// Configuração do cliente — edite src/config.js, NÃO este arquivo
import { config } from './src/config.js'

// Injeta os dados do config.js no index.html
function injectConfigInHtml() {
  return {
    name: 'fk-inject-config-html',
    transformIndexHtml(html) {
      return html
        .replace(/%APP_NAME%/g, config.clientName)
        .replace(/%APP_SHORT_NAME%/g, config.clientShortName)
        .replace(/%THEME_COLOR%/g, config.colors.primary)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    injectConfigInHtml(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: config.clientName,
        short_name: config.clientShortName,
        description: config.appDescription,
        theme_color: config.colors.primary,
        background_color: config.colors.primary,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
