/** @type {import('tailwindcss').Config} */
// As cores vêm do src/config.js — NÃO edite cores aqui, edite lá.
import { config as clientConfig } from './src/config.js'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Cores da marca (vêm do config.js) ──
        primary:   clientConfig.colors.primary,
        secondary: clientConfig.colors.secondary,
        dark:      clientConfig.colors.dark,
        action:    clientConfig.colors.action,

        // ── Aliases em português (compatibilidade) ──
        'verde-escuro': clientConfig.colors.primary,
        'rosa-claro':   clientConfig.colors.secondary,
        'azul-acao':    clientConfig.colors.action,
        'preto':        '#1a1a1a',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        'mobile': '480px',
      }
    },
  },
  plugins: [],
}
