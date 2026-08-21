// src/api/coupons.js
// Wrapper sobre /wp-json/wc/v3/coupons

import apiClient from './client'

export async function getCoupons(params = {}) {
  const { data } = await apiClient.get('/wp-json/wc/v3/coupons', {
    params: { per_page: 50, ...params },
  })
  return data
}

export async function getCoupon(id) {
  const { data } = await apiClient.get(`/wp-json/wc/v3/coupons/${id}`)
  return data
}

export async function createCoupon(payload) {
  const { data } = await apiClient.post('/wp-json/wc/v3/coupons', payload)
  return data
}

export async function updateCoupon(id, payload) {
  const { data } = await apiClient.put(`/wp-json/wc/v3/coupons/${id}`, payload)
  return data
}

export async function deleteCoupon(id) {
  const { data } = await apiClient.delete(`/wp-json/wc/v3/coupons/${id}`, {
    params: { force: true },
  })
  return data
}
