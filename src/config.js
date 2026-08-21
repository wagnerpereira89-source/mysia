// ═══════════════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DO CLIENTE — FK Digital
//  Este é o ÚNICO arquivo que você precisa editar para um cliente novo.
//  Leia o README-NOVO-CLIENTE.md para o passo a passo completo.
// ═══════════════════════════════════════════════════════════════════

export const config = {
  // ─── Identificação ───────────────────────────────────────────────
  clientName:      'Adoratta Boutique',              // nome completo (título, login)
  clientShortName: 'Adoratta',                        // nome curto (ícone do celular, máx ~12 chars)
  appDescription:  'Gestão de produtos da Adoratta',  // descrição na instalação do PWA
  appSlug:         'adoratta',                        // identificador interno (localStorage, tags)

  // ─── WordPress ───────────────────────────────────────────────────
  siteUrl: 'https://adorattab.com.br',                // SEM barra no final

  // ─── Logos ───────────────────────────────────────────────────────
  logos: {
    // Logo completa — login, header das telas e etiquetas
    full: 'https://adorattab.com.br/wp-content/uploads/2026/05/LOGOTIPO-ADORATTA-SEM-FUNDO-19.png',
    // Ícone quadrado — notificações push
    icon: 'https://adorattab.com.br/wp-content/uploads/2026/05/LOGOTIPO-ADORATTA-SEM-FUNDO-33.png',
    // Letra de fallback caso a logo não carregue
    fallbackLetter: 'A',
  },

  // ─── Cores da marca ──────────────────────────────────────────────
  // Alimentam o tailwind.config.js automaticamente.
  // Classes disponíveis: bg-primary, text-primary, border-primary,
  //                      bg-secondary, bg-dark, text-action, etc.
  colors: {
    primary:   '#354734',  // cor principal (botões, destaques)
    secondary: '#e7aea4',  // cor secundária (acentos)
    dark:      '#00021c',  // escuro da marca
    action:    '#3b82f6',  // azul de links/ações (pode manter)
  },

  // ─── Paleta dos gráficos do Dashboard ────────────────────────────
  // Tons derivados da marca. Ordem: usados de cima pra baixo nos gráficos.
  chartColors: ['#354734', '#e7aea4', '#7c9c7b', '#c9887f', '#2a3929', '#f0c4be'],

  // Cores das 3 métricas do Dashboard
  metricColors: {
    vendas:  '#e7aea4',
    receita: '#354734',
    ticket:  '#7c9c7b',
  },

  // ─── Web Push (notificações) ─────────────────────────────────────
  // ATENÇÃO: cada cliente PRECISA de chaves VAPID próprias.
  // Veja o README para gerar. Esta chave pública tem que ser
  // EXATAMENTE a mesma que está no plugin fk-webpush do WordPress.
  vapidPublicKey: 'BIQIBhxIaSXaGL6nZ33WdTbI2mkC1XS1ZgTaCyIIABG1cw7x_tb8YgEc9hNMwGC5xtGNNW8BIdvh6OL1V2xk5Lc',

  // ─── Rodapé ──────────────────────────────────────────────────────
  agencyLogo: '/logo%20azul%20escuro.png',   // arquivo dentro de /public
  agencyName: 'FK Digital',
}

export default config
