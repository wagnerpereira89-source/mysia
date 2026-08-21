// src/hooks/usePushNotifications.js
// Gerencia permissão, subscription e registro no WordPress

import { useState, useEffect, useCallback } from 'react'
import apiClient from '../api/client'
import { config } from '../config'

const VAPID_PUBLIC_KEY = config.vapidPublicKey
const STORAGE_KEY = `${config.appSlug}_push_enabled`

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [enabled, setEnabled]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [supported, setSupported] = useState(false)

  // Verificar suporte ao inicializar
  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (ok) {
      setEnabled(localStorage.getItem(STORAGE_KEY) === 'true')
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported) return { ok: false, error: 'Navegador não suporta push' }
    setLoading(true)

    try {
      // 1. Pedir permissão
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setLoading(false)
        return { ok: false, error: 'Permissão negada' }
      }

      // 2. Registrar service worker
      const reg = await navigator.serviceWorker.ready

      // 3. Criar subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 4. Enviar ao WordPress
      const sub = subscription.toJSON()
      await apiClient.post('/wp-json/fk-webpush/v1/subscribe', {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth:   sub.keys.auth,
        },
        label: `${config.clientShortName} — iPhone`,
      })

      localStorage.setItem(STORAGE_KEY, 'true')
      setEnabled(true)
      setLoading(false)
      return { ok: true }

    } catch (err) {
      console.error('[Push] Erro ao ativar:', err)
      setLoading(false)
      return { ok: false, error: err.message }
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        const sub = subscription.toJSON()
        // Avisar o WordPress
        await apiClient.post('/wp-json/fk-webpush/v1/unsubscribe', {
          endpoint: sub.endpoint,
        }).catch(() => {}) // ignorar erro se WP não responder

        await subscription.unsubscribe()
      }

      localStorage.removeItem(STORAGE_KEY)
      setEnabled(false)
    } catch (err) {
      console.error('[Push] Erro ao desativar:', err)
    }
    setLoading(false)
  }, [])

  const toggle = useCallback(async () => {
    if (enabled) return unsubscribe()
    return subscribe()
  }, [enabled, subscribe, unsubscribe])

  const testLocal = useCallback(async () => {
    if (!supported) return { ok: false, error: 'Sem suporte' }
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification('🧪 Teste Local', {
        body: 'Se você vê isso, o Service Worker funciona!',
        icon: config.logos.icon,
        badge: config.logos.icon,
        tag: 'test-local',
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }, [supported])

  return { enabled, loading, supported, toggle, subscribe, unsubscribe, testLocal }
}
