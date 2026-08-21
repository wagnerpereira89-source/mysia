import axios from 'axios'
import { loadCredentials, clearCredentials } from '../utils/storage'

// Axios instance — base URL and auth headers are injected per request
// because credentials are loaded async from encrypted storage
const apiClient = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach Basic Auth credentials from storage
apiClient.interceptors.request.use(async (config) => {
  const creds = await loadCredentials()
  if (creds) {
    config.baseURL = creds.siteUrl.replace(/\/$/, '')
    const token = btoa(`${creds.username}:${creds.password}`)
    config.headers['Authorization'] = `Basic ${token}`
  }
  return config
})

// Response interceptor: handle 401 by forcing logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearCredentials()
      // Redirect to login — using window.location since we're outside React tree
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
