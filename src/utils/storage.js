import { encryptData, decryptData } from './crypto'
import { config } from '../config'

const CREDENTIALS_KEY = `${config.appSlug}_credentials`

export async function saveCredentials(credentials) {
  const encrypted = await encryptData(credentials)
  localStorage.setItem(CREDENTIALS_KEY, encrypted)
}

export async function loadCredentials() {
  const encrypted = localStorage.getItem(CREDENTIALS_KEY)
  if (!encrypted) return null
  return decryptData(encrypted)
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY)
}

export function hasCredentials() {
  return !!localStorage.getItem(CREDENTIALS_KEY)
}
