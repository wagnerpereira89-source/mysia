// ═══════════════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DO CLIENTE — FK Digital
//  Este é o ÚNICO arquivo que você precisa editar para um cliente novo.
//  Leia o README-NOVO-CLIENTE.md para o passo a passo completo.
// ═══════════════════════════════════════════════════════════════════

export const config = {
  // ─── Identificação ───────────────────────────────────────────────
  clientName:      'Mysia Loja',                     // nome completo (título, login)
  clientShortName: 'Mysia',                          // nome curto (ícone do celular, máx ~12 chars)
  appDescription:  'Gestão de produtos da Mysia',    // descrição na instalação do PWA
  appSlug:         'mysia',                          // identificador interno (localStorage, tags)

  // ─── WordPress ───────────────────────────────────────────────────
  siteUrl: 'https://mysia.com.br',                   // SEM barra no final

  // ─── Logos ───────────────────────────────────────────────────────
  logos: {
    // Logo completa — login, header das telas e etiquetas
    full: 'https://mysia.com.br/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-10-at-09.43.42-Photoroom.png',
    // Ícone quadrado — notificações push (M dourado em fundo preto)
    icon: 'https://mysia.com.br/wp-content/uploads/2026/08/Design-sem-nome-59.png',
    // Letra de fallback caso a logo não carregue
    fallbackLetter: 'M',
  },

  // ─── Cores da marca ──────────────────────────────────────────────
  colors: {
    primary:   '#C9A46B',  // dourado Mysia (botões, destaques)
    secondary: '#000000',  // preto (header, nav de baixo, cards)
    dark:      '#000000',  // preto puro
    action:    '#3b82f6',  // azul de links/ações (pode manter)
  },

  // ─── Paleta dos gráficos do Dashboard ────────────────────────────
  chartColors: ['#C9A46B', '#000000', '#B8935A', '#4a4a4a', '#A6824B', '#8a8a8a'],

  // Cores das 3 métricas do Dashboard
  metricColors: {
    vendas:  '#C9A46B',
    receita: '#000000',
    ticket:  '#B8935A',
  },

  // ─── Web Push (notificações) ─────────────────────────────────────
  vapidPublicKey: 'BO0nyGcJLQy0zdjMLIWMb_OZ6yMntgPyTIgCQ-3rWxIMbsPGT2uA5MwFtuZuRbUWkhAjwhTbqRMbkG1D56k7WAQ',

  // ─── Rodapé ──────────────────────────────────────────────────────
  agencyLogo: '/logo%20azul%20escuro.png',
  agencyName: 'FK Digital',
}

export default config
