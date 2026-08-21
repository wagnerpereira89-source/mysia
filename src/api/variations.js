import client from './client'

function base(productId) {
  return `/wp-json/wc/v3/products/${productId}/variations`
}

// Cache buster: força requisição única para bypassar caches
const cb = () => ({ _: Date.now() })

export async function getVariations(productId) {
  const res = await client.get(base(productId), { params: { per_page: 100, ...cb() } })
  return res.data
}

export async function createVariation(productId, data) {
  const res = await client.post(base(productId), data)
  return res.data
}

export async function updateVariation(productId, variationId, data) {
  const res = await client.put(`${base(productId)}/${variationId}`, data)
  return res.data
}

export async function deleteVariation(productId, variationId) {
  const res = await client.delete(`${base(productId)}/${variationId}`, {
    params: { force: true },
  })
  return res.data
}

export async function batchUpdateVariations(productId, operations) {
  const res = await client.post(`${base(productId)}/batch`, operations)
  return res.data
}
