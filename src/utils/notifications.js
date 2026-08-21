import { config } from '../config'
// Gerenciador de notificações de novas vendas

const LAST_ORDER_KEY = `${config.appSlug}_last_order_id`
const NOTIFICATIONS_ENABLED_KEY = `${config.appSlug}_notifications_enabled`

export function getNotificationsEnabled() {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true'
}

export function setNotificationsEnabled(enabled) {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false')
}

export function getLastOrderId() {
  const val = localStorage.getItem(LAST_ORDER_KEY)
  return val ? parseInt(val, 10) : 0
}

export function setLastOrderId(id) {
  localStorage.setItem(LAST_ORDER_KEY, String(id))
}

// Pede permissão ao navegador
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { granted: false, error: 'Seu navegador não suporta notificações.' }
  }
  if (Notification.permission === 'granted') {
    return { granted: true }
  }
  if (Notification.permission === 'denied') {
    return { granted: false, error: 'Notificações bloqueadas. Habilite nas configurações do navegador.' }
  }
  const result = await Notification.requestPermission()
  return { granted: result === 'granted' }
}

// Mostra notificação nativa
export function showOrderNotification(order) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const customer = order.billing
    ? `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim() || 'Cliente'
    : 'Cliente'
  const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(parseFloat(order.total || 0))

  // Usa Service Worker se disponível (melhor para PWA)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification('🛍️ Nova venda!', {
        body: `${customer} — ${total}`,
        icon: config.logos.icon,
        badge: config.logos.icon,
        tag: `order-${order.id}`,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: '/dashboard' },
      })
    }).catch(() => {
      // fallback: notificação simples
      new Notification('🛍️ Nova venda!', {
        body: `${customer} — ${total}`,
      })
    })
  } else {
    new Notification('🛍️ Nova venda!', {
      body: `${customer} — ${total}`,
    })
  }
}
