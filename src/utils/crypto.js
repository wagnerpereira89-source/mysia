import { config } from '../config'
// AES-GCM encryption using Web Crypto API
// Key is derived from a fixed app secret + salt for this device

const APP_SECRET = `${config.appSlug}-app-v1`
const STORAGE_KEY_PREFIX = `${config.appSlug}_enc_`

async function deriveKey() {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(APP_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const salt = encoder.encode(`${config.appSlug}-salt-fixed`)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data) {
  const key = await deriveKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  )
  // Combine iv + encrypted data and encode as base64
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptData(encryptedBase64) {
  try {
    const key = await deriveKey()
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(decrypted))
  } catch {
    return null
  }
}
