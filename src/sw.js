// src/sw.js — Service Worker (template FK Digital)
// Faz APENAS:
//  1. Precache dos assets do app (HTML/CSS/JS gerados pelo Vite)
//  2. Recebe Web Push (notificações)
// NÃO intercepta nada da API do WordPress / uploads de mídia.

import { precacheAndRoute } from 'workbox-precaching'
import { config } from './config'

// Precache só dos assets locais (Vite injeta a lista aqui no build)
precacheAndRoute(self.__WB_MANIFEST || [])

// Ativação imediata da nova versão
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ─── Push recebido ────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {
      title: `🛍️ ${config.clientShortName}`,
      body: event.data ? event.data.text() : 'Nova notificação',
    }
  }

  const title   = data.title || `🛍️ ${config.clientShortName}`
  const options = {
    body:     data.body  || 'Toque para ver',
    icon:     data.icon  || config.logos.icon,
    badge:    data.badge || config.logos.icon,
    data:     { url: data.url || '/orders' },
    vibrate:  [200, 100, 200],
    tag:      `${config.appSlug}-order`,
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ─── Clique na notificação ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/orders'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
