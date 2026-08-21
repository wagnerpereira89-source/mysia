export function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function formatStock(qty) {
  if (qty === null || qty === undefined || qty === '') return '∞ Infinito'
  return String(qty)
}

export function truncate(text, max = 60) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function buildVariationName(variation) {
  if (!variation?.attributes?.length) return 'Variação'
  return variation.attributes.map(a => a.option).join(' / ')
}

export function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}
