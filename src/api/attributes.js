import client from './client'

const BASE = '/wp-json/wc/v3/products/attributes'

export async function getAttributes() {
  const res = await client.get(BASE, { params: { per_page: 100 } })
  return res.data
}

export async function createAttribute(data) {
  const res = await client.post(BASE, data)
  return res.data
}

export async function getAttributeTerms(attributeId) {
  const res = await client.get(`${BASE}/${attributeId}/terms`, {
    params: { per_page: 100 },
  })
  return res.data
}

export async function createAttributeTerm(attributeId, data) {
  const res = await client.post(`${BASE}/${attributeId}/terms`, data)
  return res.data
}
