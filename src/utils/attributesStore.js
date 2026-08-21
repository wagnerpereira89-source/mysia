import { config } from '../config'
// Temporary bridge for passing attributes between ProductForm <-> Properties <-> NewProperty
// Uses sessionStorage so state survives navigation without a global store

const KEY = `${config.appSlug}_attributes_draft`
const FORM_KEY = `${config.appSlug}_form_draft`

// --- Atributos ---

export function saveAttributesDraft(attributes) {
  sessionStorage.setItem(KEY, JSON.stringify(attributes))
}

export function loadAttributesDraft() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearAttributesDraft() {
  sessionStorage.removeItem(KEY)
}

// --- Formulário inteiro (nome, descrição, categorias, tags, fotos, status) ---

export function saveFormDraft(form) {
  try {
    // Fotos com File não são serializáveis — salva só as que já têm id/src (já uploadadas)
    const photos = (form.photos || []).map((p) => ({
      id: p.id || null,
      src: p.src || p.preview || null,
      preview: p.preview || p.src || null,
      isMain: p.isMain || false,
      // file não é serializado — foto nova não sobrevive à navegação
    })).filter((p) => p.src || p.preview)

    sessionStorage.setItem(FORM_KEY, JSON.stringify({ ...form, photos }))
  } catch {
    // ignora erros de serialização
  }
}

export function loadFormDraft() {
  try {
    const raw = sessionStorage.getItem(FORM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearFormDraft() {
  sessionStorage.removeItem(FORM_KEY)
}
