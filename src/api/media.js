import { loadCredentials } from '../utils/storage'

// Media upload uses multipart/form-data — needs custom headers, so we use fetch directly
export async function uploadMedia(file, onProgress) {
  const creds = await loadCredentials()
  if (!creds) throw new Error('Sem credenciais')

  const base = creds.siteUrl.replace(/\/$/, '')
  const token = btoa(`${creds.username}:${creds.password}`)

  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/wp-json/wp/v2/media`)
    xhr.setRequestHeader('Authorization', `Basic ${token}`)
    xhr.setRequestHeader('Content-Disposition', `attachment; filename="${file.name}"`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload falhou: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Erro de rede no upload'))
    xhr.send(formData)
  })
}
