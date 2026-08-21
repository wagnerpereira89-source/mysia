import client from './client'

const BASE = '/wp-json/wc/v3/products/tags'

export async function getTags() {
  const res = await client.get(BASE, { params: { per_page: 100 } })
  return res.data
}

export async function createTag(data) {
  const res = await client.post(BASE, data)
  return res.data
}
