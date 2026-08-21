import apiClient from './client'
import { config } from '../config'
 
const ORDERS_ENDPOINT = '/wp-json/wc/v3/orders'
 
// Status que NÃO contam como venda
const EXCLUDED_STATUSES = [
  'cancelled', 'failed', 'refunded', 'pending',
  'trash', 'draft', 'auto-draft', 'checkout-draft',
]
 
// Status do fluxo de pedidos
export const ORDER_STATUSES = [
  { key: 'processing',      label: 'Pago',                  color: '#22c55e', next: null, back: null },
  { key: 'embalado',        label: 'Embalado',              color: config.colors.action, next: null, back: 'processing' },
  { key: 'pronto-retirada', label: 'Pronto para retirar',   color: '#f59e0b', next: 'retirado', back: 'embalado' },
  { key: 'pronto-envio',    label: 'Pronto para envio',     color: '#f59e0b', next: 'enviado',  back: 'embalado' },
  { key: 'retirado',        label: 'Retirado',              color: '#6366f1', next: 'completed', back: 'embalado' },
  { key: 'enviado',         label: 'Enviado',               color: '#6366f1', next: 'completed', back: 'embalado' },
  { key: 'completed',       label: 'Concluído',             color: '#10b981', next: null, back: 'processing' },
]
 
// Próximo status, considerando o tipo (retirada/envio/motoboy)
export function getNextStatus(currentStatus, tipo) {
  if (currentStatus === 'processing') {
    return { key: 'embalado', label: 'Marcar como Embalado' }
  }
  if (currentStatus === 'embalado') {
    if (tipo === 'retirada') return { key: 'pronto-retirada', label: 'Pronto para retirar' }
    return { key: 'pronto-envio', label: 'Pronto para envio' }
  }
  if (currentStatus === 'pronto-retirada') return { key: 'retirado', label: 'Marcar como Retirado' }
  if (currentStatus === 'pronto-envio')    return { key: 'enviado',  label: 'Marcar como Enviado' }
  if (currentStatus === 'retirado' || currentStatus === 'enviado') {
    return { key: 'completed', label: 'Concluir pedido' }
  }
  return null
}
 
// Status anterior
export function getBackStatus(currentStatus) {
  const s = ORDER_STATUSES.find((x) => x.key === currentStatus)
  if (!s || !s.back) return null
  const back = ORDER_STATUSES.find((x) => x.key === s.back)
  return back ? { key: back.key, label: `Voltar para ${back.label}` } : null
}
 
// Identifica o tipo de entrega pelo método de envio
export function getOrderType(order) {
  const lines = order.shipping_lines || []
  for (const line of lines) {
    const name = (line.method_title || '').toLowerCase()
    const id = (line.method_id || '').toLowerCase()
 
    if (name.includes('motoboy') || id.includes('motoboy')) return 'motoboy'
    if (name.includes('retirada') || name.includes('retira') || id.includes('local_pickup')) return 'retirada'
  }
  return 'envio'
}
 
export async function getOrders({ after, before, status, per_page = 100, page = 1, search } = {}) {
  const params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
    status: status || 'any',
    orderby: 'date',
    order: 'desc',
  })
  if (after) params.set('after', after)
  if (before) params.set('before', before)
  if (search) params.set('search', search)
 
  const res = await apiClient.get(`${ORDERS_ENDPOINT}?${params}`)
  return {
    data: res.data,
    total: parseInt(res.headers['x-wp-total'] || '0', 10),
    pages: parseInt(res.headers['x-wp-totalpages'] || '1', 10),
  }
}
 
export async function getAllOrders({ after, before } = {}) {
  let page = 1
  let allOrders = []
  let hasMore = true
 
  while (hasMore) {
    const res = await getOrders({ after, before, per_page: 100, page })
    allOrders = [...allOrders, ...res.data]
    hasMore = page < res.pages
    page++
    if (page > 10) break
  }
 
  return allOrders.filter((o) => !EXCLUDED_STATUSES.includes(o.status))
}
 
// Atualizar status de um pedido
export async function updateOrderStatus(orderId, newStatus) {
  const res = await apiClient.put(`${ORDERS_ENDPOINT}/${orderId}`, { status: newStatus })
  return res.data
}
 
// Atualizar status em massa
export async function batchUpdateOrderStatus(orderIds, newStatus) {
  // WooCommerce batch endpoint
  const res = await apiClient.post(`${ORDERS_ENDPOINT}/batch`, {
    update: orderIds.map((id) => ({ id, status: newStatus })),
  })
  return res.data
}
 
// Buscar pedidos por status (usado no painel Pedidos)
export async function getOrdersByStatus(status, { search, cpf, per_page = 100 } = {}) {
  const params = new URLSearchParams({
    per_page: String(per_page),
    status,
    orderby: 'date',
    order: 'desc',
  })
  if (search) params.set('search', search)
  if (cpf) params.set('cpf', cpf)
 
  const res = await apiClient.get(`${ORDERS_ENDPOINT}?${params}`)
  return res.data
}
 
// Busca contagem de cada status (para badges)
export async function getStatusCounts() {
  const statuses = ['processing', 'embalado', 'pronto-retirada', 'pronto-envio', 'retirado', 'enviado', 'completed']
  const counts = {}
 
  await Promise.all(statuses.map(async (s) => {
    try {
      const params = new URLSearchParams({ per_page: '1', status: s })
      const res = await apiClient.get(`${ORDERS_ENDPOINT}?${params}`)
      counts[s] = parseInt(res.headers['x-wp-total'] || '0', 10)
    } catch {
      counts[s] = 0
    }
  }))
 
  return counts
}
 
// Notes
export async function getOrderNotes(orderId) {
  try {
    const res = await apiClient.get(`${ORDERS_ENDPOINT}/${orderId}/notes`)
    return res.data || []
  } catch {
    return []
  }
}
 
export function detectPaymentMethod(notes = []) {
  const allText = notes.map((n) => (n.note || '').toLowerCase()).join(' ')
  if (allText.includes('pix')) return 'PIX'
  if (allText.includes('cartão') || allText.includes('cartao') || allText.includes('credit')) return 'Cartão de Crédito'
  return 'Outros'
}
 
export async function getOrdersPaymentMethods(orders, concurrency = 5) {
  const results = {}
  const queue = [...orders]
  async function worker() {
    while (queue.length > 0) {
      const order = queue.shift()
      if (!order) break
      const notes = await getOrderNotes(order.id)
      results[order.id] = detectPaymentMethod(notes)
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
  return results
}
