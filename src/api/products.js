import client from './client'

const BASE = '/wp-json/wc/v3/products'

// Cache buster: força requisição única para bypassar caches de Service Worker,
// LiteSpeed e cache HTTP do iPhone. Não afeta o WP, é só um param ignorado.
const cb = () => ({ _: Date.now() })

export async function getProducts(params = {}) {
  const res = await client.get(BASE, { params: { per_page: 20, ...cb(), ...params } })
  return { data: res.data, total: parseInt(res.headers['x-wp-total'] || 0) }
}

export async function getProduct(id) {
  const res = await client.get(`${BASE}/${id}`, { params: cb() })
  return res.data
}

export async function createProduct(data) {
  const res = await client.post(BASE, data)
  return res.data
}

export async function updateProduct(id, data) {
  const res = await client.put(`${BASE}/${id}`, data)
  return res.data
}

export async function deleteProduct(id) {
  const res = await client.delete(`${BASE}/${id}`, { params: { force: true } })
  return res.data
}
