import client from './client'

const BASE = '/wp-json/wc/v3/products/categories'

export async function getCategories() {
  const res = await client.get(BASE, { params: { per_page: 100 } })
  return res.data
}

export async function createCategory(data) {
  const res = await client.post(BASE, data)
  return res.data
}
