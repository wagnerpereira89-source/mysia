import axios from 'axios'

export async function validateCredentials({ siteUrl, username, password }) {
  const base = siteUrl.replace(/\/$/, '')
  const token = btoa(`${username}:${password}`)
  const response = await axios.get(`${base}/wp-json/wp/v2/users/me`, {
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  })
  return response.data
}
