# FK Digital — App de Gestão WooCommerce (Template)

PWA de gestão de produtos, pedidos, dashboard e cupons para lojas WooCommerce.

**Para colocar no ar para um cliente novo, você edita basicamente 1 arquivo: `src/config.js`.**

---

## Índice

- [Passo 1 — Duplicar o repositório](#passo-1--duplicar-o-repositório)
- [Passo 2 — Gerar as chaves VAPID](#passo-2--gerar-as-chaves-vapid-notificações)
- [Passo 3 — Editar o src/config.js](#passo-3--editar-o-srcconfigjs)
- [Passo 4 — Trocar os ícones](#passo-4--trocar-os-ícones-do-app)
- [Passo 5 — Deploy no Vercel](#passo-5--deploy-no-vercel)
- [Passo 6 — Plugins no WordPress](#passo-6--instalar-os-plugins-no-wordpress-do-cliente)
- [Passo 7 — Application Password](#passo-7--application-password)
- [Passo 8 — Testar](#passo-8--testar)
- [Checklist final](#checklist-final)
- [Problemas comuns](#problemas-comuns)

---

## Passo 1 — Duplicar o repositório

1. No GitHub, abra este repositório
2. **Use this template** → **Create a new repository**
3. Nome: `<cliente>-app` (ex: `lojadamaria-app`)

> Se o botão não aparecer: **Settings** → marque **Template repository**.

---

## Passo 2 — Gerar as chaves VAPID (notificações)

**Cada cliente precisa de chaves próprias.** Reutilizar as mesmas faz notificação de um cliente ir para o celular do outro.

1. Acesse um gerador de VAPID (ex: `vapidkeys.com`)
2. Gere o par de chaves
3. Você recebe:
   - **Public Key** → vai no `src/config.js` **e** no plugin
   - **Private Key** → vai só no plugin

Guarde as duas no gerenciador de senhas da agência.

---

## Passo 3 — Editar o `src/config.js`

Único arquivo obrigatório. Abra e preencha:

```js
export const config = {
  clientName:      'Loja da Maria',
  clientShortName: 'Maria',                     // máx ~12 chars
  appDescription:  'Gestão da Loja da Maria',
  appSlug:         'lojadamaria',               // só letras minúsculas, sem espaço

  siteUrl: 'https://lojadamaria.com.br',        // SEM barra no final

  logos: {
    full: 'https://lojadamaria.com.br/wp-content/uploads/logo.png',
    icon: 'https://lojadamaria.com.br/wp-content/uploads/icone.png',
    fallbackLetter: 'M',
  },

  colors: {
    primary:   '#8B2635',
    secondary: '#F2D9D0',
    dark:      '#1A1A2E',
    action:    '#3b82f6',   // pode manter
  },

  chartColors:  ['#8B2635', '#F2D9D0', '#B5525F', '#E0B0A8', '#5C1923', '#F7E8E3'],
  metricColors: { vendas: '#F2D9D0', receita: '#8B2635', ticket: '#B5525F' },

  vapidPublicKey: 'COLE_A_PUBLIC_KEY_DO_PASSO_2',

  agencyLogo: '/logo%20azul%20escuro.png',
  agencyName: 'FK Digital',
}
```

Isso já ajusta **automaticamente**:

- Nome e ícone do app na tela inicial do celular
- Cor do tema (barra do navegador)
- Logo e URL padrão da tela de login
- Logo no header de todas as telas e nas etiquetas de impressão
- Ícone das notificações push
- Chave VAPID
- Cores dos gráficos do Dashboard
- Todas as classes `bg-primary`, `text-primary`, `bg-secondary` do app

> **`appSlug`**: usado nas chaves internas do navegador. Use algo único por cliente e **não mude depois** — mudar desloga o usuário e perde os rascunhos salvos.

---

## Passo 4 — Trocar os ícones do app

Substitua na pasta `/public`:

| Arquivo | Tamanho |
|---|---|
| `apple-touch-icon.png` | 180×180 |
| `icon-192.png` | 192×192 |
| `icon-512.png` | 512×512 |
| `favicon.ico` | 32×32 |

> Dica: `realfavicongenerator.net` gera todos a partir de uma imagem.

O arquivo `logo azul escuro.png` é a logo da FK Digital do rodapé do login — mantenha.

---

## Passo 5 — Deploy no Vercel

1. Vercel → **Add New** → **Project**
2. Conecte ao repositório do Passo 1
3. Configurações padrão → **Deploy**
4. Sai uma URL tipo `lojadamaria-app.vercel.app`

Opcional: **Settings → Domains** para apontar domínio próprio.

---

## Passo 6 — Instalar os plugins no WordPress do cliente

| Plugin | Para quê |
|---|---|
| `fk-webpush-plugin.zip` | Notificações push (obrigatório se quiser push) |
| `pedidos-adoratta.zip` | Painel de pedidos no WP (opcional) |
| `adoratta-busca-cpf.zip` | Busca por CPF na API (opcional) |

### Ajustar as chaves VAPID no plugin

Antes de zipar o `fk-webpush` para este cliente, edite `fk-webpush.php`:

```php
define('FK_VAPID_PUBLIC_KEY',      'PUBLIC_KEY_DO_PASSO_2');
define('FK_VAPID_PRIVATE_KEY_PEM', 'PRIVATE_KEY_DO_PASSO_2_EM_BASE64');
```

E o e-mail em `includes/class-push-sender.php`:

```php
private $subject = 'mailto:contato@lojadamaria.com.br';
```

E o ícone da notificação no mesmo arquivo (o método `send_to`).

> A **public key** do plugin tem que ser **idêntica** à do `config.js`. Se diferirem, o push não chega.

---

## Passo 7 — Application Password

No WordPress do cliente:

1. **Usuários** → o usuário admin (ou crie um só para o app)
2. Role até **Senhas de aplicativo**
3. Nome: `App de Gestão` → **Adicionar nova senha de aplicativo**
4. **Copie a senha** (só aparece uma vez)

Entregue à cliente: usuário + senha de aplicativo.

---

## Passo 8 — Testar

1. No iPhone, abra a URL no **Safari** (obrigatório — Chrome não suporta push no iOS)
2. Botão compartilhar → **Adicionar à Tela de Início**
3. Abra pelo ícone da tela inicial
4. Login com usuário + application password
5. Dashboard → toque no **sininho** → **Permitir**
6. No WordPress: **Ferramentas → FK Web Push** → deve aparecer 1 subscription
7. Feche o app → **Enviar push de teste** → a notificação deve chegar

---

## Checklist final

- [ ] Repositório duplicado
- [ ] Chaves VAPID geradas e guardadas
- [ ] `src/config.js` preenchido (inclusive `appSlug`)
- [ ] Ícones trocados em `/public`
- [ ] Build do Vercel verde (Ready)
- [ ] Plugins instalados e ativos no WordPress
- [ ] Public key do plugin == public key do `config.js`
- [ ] Application Password criada e entregue
- [ ] Push testado com o app fechado

---

## Problemas comuns

**Push não chega**
→ Public key do `config.js` tem que ser idêntica à do plugin.
→ O app precisa ter sido instalado pelo **Safari**, não pelo Chrome.
→ **Ferramentas → FK Web Push**: aparece alguma subscription?
→ iPhone com Modo Foco / Não Perturbe ligado bloqueia a notificação.

**Build do Vercel falha**
→ Quase sempre é vírgula ou aspas faltando no `config.js`. Veja o log do deploy.

**Cores não mudaram**
→ Confira se editou `colors` dentro do `config.js` e se o deploy terminou.
→ Não use `bg-[#354734]` em código novo — use `bg-primary`.

**App abre em branco depois de atualizar**
→ Normal na troca de Service Worker. Feche o app e abra de novo.

**Logo não aparece**
→ A URL em `logos.full` precisa ser pública (teste abrindo no navegador anônimo).

---

## Para desenvolvedores

```bash
npm install
npm run dev     # ambiente local
npm run build   # build de produção
```

**Regra de ouro ao mexer no código:**
use `bg-primary` / `text-primary` / `bg-secondary`, nunca a cor em hexadecimal.
E qualquer coisa específica do cliente vai no `src/config.js`, nunca hardcoded.
