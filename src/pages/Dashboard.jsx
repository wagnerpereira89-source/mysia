import { useState, useEffect, useCallback } from 'react'
import { SlidersHorizontal, RefreshCw, X, ChevronDown, Bell, BellOff, Loader2 } from 'lucide-react'
import { getAllOrders, getOrdersPaymentMethods } from '../api/orders'
import { usePushNotifications } from '../hooks/usePushNotifications'
import toast from 'react-hot-toast'
import { config } from '../config'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

function getPeriodDates(period, customFrom, customTo) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'today') {
    return {
      after: new Date(today).toISOString(),
      before: new Date(today.getTime() + 86400000).toISOString(),
      label: 'Hoje',
      days: 1,
    }
  }
  if (period === 'yesterday') {
    const yesterday = new Date(today.getTime() - 86400000)
    return {
      after: yesterday.toISOString(),
      before: new Date(today).toISOString(),
      label: 'Ontem',
      days: 1,
    }
  }
  if (period === 'week') {
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    return {
      after: start.toISOString(),
      before: new Date(today.getTime() + 86400000).toISOString(),
      label: 'Semana atual',
      days: 7,
    }
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      after: start.toISOString(),
      before: new Date(today.getTime() + 86400000).toISOString(),
      label: 'Mês atual',
      days: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
    }
  }
  if (period === 'custom' && customFrom && customTo) {
    const from = new Date(customFrom)
    const to = new Date(customTo)
    to.setDate(to.getDate() + 1)
    const days = Math.ceil((to - from) / 86400000)
    return { after: from.toISOString(), before: to.toISOString(), label: 'Personalizado', days }
  }
  return getPeriodDates('month', null, null)
}

function getPrevPeriodDates(period, customFrom, customTo) {
  const curr = getPeriodDates(period, customFrom, customTo)
  const after = new Date(curr.after)
  const before = new Date(curr.before)
  const diff = before - after
  return {
    after: new Date(after - diff).toISOString(),
    before: curr.after,
  }
}

function getDayLabel(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('pt-BR', { month: 'short' })}`
}

function calcMetrics(orders) {
  const receita = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const vendas = orders.length
  const ticket = vendas > 0 ? receita / vendas : 0
  return { receita, vendas, ticket }
}

function calcChange(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / prev) * 100
}

function buildChartData(orders, period, customFrom, customTo) {
  const { after, before, days } = getPeriodDates(period, customFrom, customTo)
  const map = {}

  // gera todos os dias do período
  const start = new Date(after)
  for (let i = 0; i < Math.min(days, 31); i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: key, receita: 0, vendas: 0 }
  }

  orders.forEach((o) => {
    const key = new Date(o.date_created).toISOString().slice(0, 10)
    if (map[key]) {
      map[key].receita += parseFloat(o.total || 0)
      map[key].vendas += 1
    }
  })

  return Object.values(map)
}

function buildPaymentData(orders, methodsMap = {}) {
  const map = { 'PIX': 0, 'Cartão de Crédito': 0, 'Outros': 0 }

  orders.forEach((o) => {
    const detected = methodsMap[o.id]
    if (detected === 'PIX') map['PIX']++
    else if (detected === 'Cartão de Crédito') map['Cartão de Crédito']++
    else {
      // Fallback: tenta pelo título do método
      const method = (o.payment_method_title || '').toLowerCase()
      if (method.includes('pix')) map['PIX']++
      else if (method.includes('cart') || method.includes('credit')) map['Cartão de Crédito']++
      else map['Outros']++
    }
  })

  const total = orders.length || 1
  return Object.entries(map)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      count,
      pct: ((count / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count)
}

function buildTopProducts(orders) {
  const map = {}
  orders.forEach((o) => {
    (o.line_items || []).forEach((item) => {
      const id = item.product_id
      if (!map[id]) map[id] = { name: item.name, image: item.image?.src || null, qty: 0, total: 0 }
      map[id].qty += item.quantity
      map[id].total += parseFloat(item.total || 0)
    })
  })
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5)
}

function buildTopCities(orders) {
  const map = {}
  orders.forEach((o) => {
    const city = o.shipping?.city || o.billing?.city || 'Desconhecida'
    const state = o.shipping?.state || o.billing?.state || ''
    const key = `${city}|${state}`
    if (!map[key]) map[key] = { city, state, orders: 0, total: 0 }
    map[key].orders++
    map[key].total += parseFloat(o.total || 0)
  })
  return Object.values(map).sort((a, b) => b.orders - a.orders).slice(0, 10)
}

function buildTopPickup(orders) {
  const map = {}
  orders.forEach((o) => {
    const method = (o.shipping_lines || [])[0]?.method_title || null
    if (!method) return
    if (!map[method]) map[method] = { name: method, count: 0, total: 0 }
    map[method].count++
    map[method].total += parseFloat(o.total || 0)
  })
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6)
}

// ─── Componentes internos ────────────────────────────────────────────────────

const PAYMENT_COLORS = config.chartColors
const DONUT_COLORS = config.chartColors.slice(0, 5)

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  let cumulative = 0
  const radius = 80
  const cx = 100
  const cy = 100
  const strokeWidth = 28

  const segments = data.map((d, i) => {
    const pct = d.count / total
    const start = cumulative
    cumulative += pct
    const startAngle = start * 2 * Math.PI - Math.PI / 2
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2
    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)
    const largeArc = pct > 0.5 ? 1 : 0
    return { path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, color: DONUT_COLORS[i % DONUT_COLORS.length], d }
  })

  return (
    <svg viewBox="0 0 200 200" className="w-40 h-40 mx-auto">
      {segments.map((seg, i) => (
        <path
          key={i}
          d={seg.path}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}

function BarChart({ data, metric }) {
  const values = data.map((d) => metric === 'receita' ? d.receita : d.vendas)
  const max = Math.max(...values, 1)
  const chartH = 120
  const barW = Math.max(8, Math.min(28, Math.floor(280 / data.length) - 4))

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(300, data.length * (barW + 6)) }} className="px-2">
        <svg
          viewBox={`0 0 ${Math.max(300, data.length * (barW + 6))} ${chartH + 32}`}
          className="w-full"
          style={{ height: chartH + 40 }}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={0} y1={chartH * (1 - t)}
              x2={Math.max(300, data.length * (barW + 6))} y2={chartH * (1 - t)}
              stroke="#e4e4e7" strokeWidth="1"
            />
          ))}
          {data.map((d, i) => {
            const val = metric === 'receita' ? d.receita : d.vendas
            const h = Math.max(2, (val / max) * chartH)
            const x = i * (barW + 6) + 3
            const y = chartH - h
            const showLabel = data.length <= 14 || i % Math.ceil(data.length / 7) === 0
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} fill={config.colors.primary} rx={3} />
                {showLabel && (
                  <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize="9" fill="#a1a1aa">
                    {getDayLabel(d.date)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function ChangeTag({ value }) {
  const positive = value >= 0
  return (
    <span className={`text-xs font-medium ${positive ? 'text-primary' : 'text-red-500'}`}>
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

// ─── Modal de filtro ─────────────────────────────────────────────────────────

function FilterModal({ period, customFrom, customTo, compare, onSave, onClose }) {
  const [p, setP] = useState(period)
  const [from, setFrom] = useState(customFrom || new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(customTo || new Date().toISOString().slice(0, 10))
  const [comp, setComp] = useState(compare)

  const handleSave = () => {
    onSave({ period: p, customFrom: from, customTo: to, compare: comp })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white w-full max-w-mobile rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-[#1a1a1a]">Ajustar períodos</h2>
          <button onClick={onClose} className="text-[#a1a1aa]"><X size={20} /></button>
        </div>
        <p className="text-sm text-[#52525b] mb-5">Selecione um período principal para visualizar os dados.</p>

        <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Período principal</label>
        <div className="relative mb-4">
          <select
            value={p}
            onChange={(e) => setP(e.target.value)}
            className="w-full h-11 px-3 pr-10 text-sm bg-white border-2 border-primary rounded-xl appearance-none focus:outline-none"
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="week">Semana atual</option>
            <option value="month">Mês atual</option>
            <option value="custom">Personalizar</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />
        </div>

        {p === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[12px] font-medium text-[#52525b] mb-1 block">De</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Até</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary" />
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input type="checkbox" checked={comp} onChange={(e) => setComp(e.target.checked)}
            className="w-4 h-4 accent-primary" />
          <span className="text-sm text-[#1a1a1a]">Comparar com períodos anteriores</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-11 border border-[#e4e4e7] rounded-xl text-sm text-[#52525b]">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex-1 h-11 bg-primary text-white rounded-xl text-sm font-medium">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const [period, setPeriod] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [compare, setCompare] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [metric, setMetric] = useState('receita') // receita | vendas | ticket | conversao

  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [orders, setOrders] = useState([])
  const [prevOrders, setPrevOrders] = useState([])
  const [paymentMethodsMap, setPaymentMethodsMap] = useState({})

  // Notificações Web Push
  const { enabled: notifEnabled, loading: notifLoading, supported: notifSupported, toggle: togglePush } = usePushNotifications()

  const periodDates = getPeriodDates(period, customFrom, customTo)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const curr = await getAllOrders({ after: periodDates.after, before: periodDates.before })
      setOrders(curr)

      // Busca métodos de pagamento reais (PIX vs Cartão) das notas dos pedidos
      if (curr.length > 0) {
        getOrdersPaymentMethods(curr.slice(0, 200)).then(setPaymentMethodsMap).catch(() => {})
      } else {
        setPaymentMethodsMap({})
      }

      if (compare) {
        const prev = getPrevPeriodDates(period, customFrom, customTo)
        const prevData = await getAllOrders({ after: prev.after, before: prev.before })
        setPrevOrders(prevData)
      } else {
        setPrevOrders([])
      }

      setLastUpdate(new Date())
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [period, customFrom, customTo, compare])

  useEffect(() => { load() }, [load])

  // Auto-refresh a cada 2 minutos
  useEffect(() => {
    const interval = setInterval(load, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  // Toggle de notificações Web Push
  const handleToggleNotifications = async () => {
    const result = await togglePush()
    if (result?.ok === false) {
      if (result.error === 'Permissão negada') {
        toast.error(`Permissão negada. Vá em Ajustes → ${config.clientShortName} → Notificações e ative.`)
      } else {
        toast.error(result.error || 'Erro ao configurar notificações')
      }
    } else if (result?.ok === true) {
      toast.success('✅ Notificações ativadas! Você receberá alertas mesmo com o app fechado.')
    } else if (result === undefined && notifEnabled) {
      toast.success('Notificações desativadas')
    }
  }

  const curr = calcMetrics(orders)
  const prev = calcMetrics(prevOrders)
  const chartData = buildChartData(orders, period, customFrom, customTo)
  const paymentData = buildPaymentData(orders, paymentMethodsMap)
  const topProducts = buildTopProducts(orders)
  const topCities = buildTopCities(orders)
  const topPickup = buildTopPickup(orders)
  const maxPickup = topPickup[0]?.count || 1

  const metrics = [
    { key: 'vendas', label: 'Vendas', value: curr.vendas, prevValue: prev.vendas, format: (v) => v.toString() },
    { key: 'receita', label: 'Receita', value: curr.receita, prevValue: prev.receita, format: formatBRL },
    { key: 'ticket', label: 'Ticket médio', value: curr.ticket, prevValue: prev.ticket, format: formatBRL },
  ]

  const metricColors = config.metricColors

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e4e4e7] px-4 h-20 flex items-center gap-3">
        <img
          src={config.logos.full}
          alt={config.clientName}
          className="h-14 w-auto object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div className="w-px h-8 bg-[#e4e4e7]" />
        <h1 className="text-base font-bold text-[#1a1a1a]">Dashboard</h1>
        <div className="flex-1" />
        {notifSupported && (
          <button onClick={handleToggleNotifications}
            disabled={notifLoading}
            className={`p-2 rounded-lg transition-colors ${notifEnabled ? 'text-primary bg-primary/10' : 'text-[#52525b] hover:bg-[#f4f4f5]'} disabled:opacity-50`}
            title={notifEnabled ? 'Notificações ativadas' : 'Ativar notificações'}>
            {notifLoading ? <Loader2 size={18} className="animate-spin" /> : notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        )}
        <button onClick={load} disabled={loading}
          className="p-2 rounded-lg text-[#52525b] hover:bg-[#f4f4f5] disabled:opacity-40">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="max-w-mobile mx-auto px-4 pb-28 space-y-4 py-4">

        {/* Última atualização */}
        {lastUpdate && (
          <p className="text-xs text-[#a1a1aa] flex items-center gap-1">
            <RefreshCw size={11} /> Última atualização: {formatDate(lastUpdate)}
          </p>
        )}

        {/* Filtro de período */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">{periodDates.label}</p>
            {compare && <p className="text-xs text-secondary mt-0.5">Comparando com período anterior</p>}
          </div>
          <button onClick={() => setFilterOpen(true)}
            className="h-9 w-9 bg-[#f4f4f5] rounded-xl flex items-center justify-center text-[#52525b]">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Gráfico */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <BarChart data={chartData} metric={metric} />
          )}
        </div>

        {/* Cards de métricas */}
        <div className="space-y-3">
          {metrics.map((m) => {
            const change = compare ? calcChange(m.value, m.prevValue) : null
            const isSelected = metric === m.key
            return (
              <div key={m.key}
                className={`bg-white rounded-2xl border-2 p-4 flex items-start justify-between transition-colors cursor-pointer ${isSelected ? 'border-primary' : 'border-[#e4e4e7]'}`}
                onClick={() => setMetric(m.key)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: metricColors[m.key] }} />
                    <span className="text-sm text-[#52525b]">{m.label}</span>
                  </div>
                  <p className="text-xl font-bold text-[#1a1a1a]">{loading ? '—' : m.format(m.value)}</p>
                  {compare && !loading && change !== null && (
                    <ChangeTag value={change} />
                  )}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${isSelected ? 'border-primary bg-primary' : 'border-[#d4d4d8]'}`}>
                  {isSelected && <div className="w-full h-full rounded-full bg-white scale-50 block" />}
                </div>
              </div>
            )
          })}
        </div>

        {/* Métodos de pagamento */}
        {!loading && paymentData.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
            <p className="text-base font-bold text-[#1a1a1a] mb-4">Métodos de pagamento</p>
            <DonutChart data={paymentData} />
            <div className="mt-4 space-y-2">
              {paymentData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-sm text-[#1a1a1a]">{d.name}</span>
                  </div>
                  <span className="text-sm text-[#52525b]">{d.pct}% ({d.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top produtos */}
        {!loading && topProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-bold text-[#1a1a1a]">Melhores desempenhos</p>
            </div>
            <p className="text-xs text-[#a1a1aa] mb-4">{periodDates.label}</p>
            <div className="flex justify-between text-xs font-semibold text-[#a1a1aa] mb-2 px-1">
              <span>Produtos</span>
              <span>Itens vendidos</span>
            </div>
            <div className="divide-y divide-[#f4f4f5]">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#f4f4f5]">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-secondary/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a] truncate">{p.name}</p>
                    <p className="text-xs text-[#52525b]">Vendas líquidas: {formatBRL(p.total)}</p>
                  </div>
                  <span className="text-base font-bold text-[#1a1a1a]">{p.qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top unidades de retirada */}
        {!loading && topPickup.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
            <p className="text-base font-bold text-[#1a1a1a]">Top Unidades de Retirada</p>
            <p className="text-xs text-[#a1a1aa] mb-4">Ranking de lojas físicas</p>
            <div className="space-y-4">
              {topPickup.map((u, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#a1a1aa] w-6">#{i + 1}</span>
                      <span className="text-sm font-medium text-[#1a1a1a] truncate max-w-[180px]">{u.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#1a1a1a]">{u.count}x</span>
                      <p className="text-xs text-[#a1a1aa]">{formatBRL(u.total)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-[#f4f4f5] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(u.count / maxPickup) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 10 cidades */}
        {!loading && topCities.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
            <p className="text-base font-bold text-[#1a1a1a] mb-4">Top 10 cidades</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold text-[#a1a1aa] uppercase">
                    <th className="text-left pb-2 w-6">#</th>
                    <th className="text-left pb-2">Cidade</th>
                    <th className="text-center pb-2">UF</th>
                    <th className="text-center pb-2">Pedidos</th>
                    <th className="text-right pb-2">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4f4f5]">
                  {topCities.map((c, i) => (
                    <tr key={i}>
                      <td className="py-2 text-[#a1a1aa] text-xs">{i + 1}</td>
                      <td className="py-2 font-medium text-[#1a1a1a]">{c.city}</td>
                      <td className="py-2 text-center text-[#52525b]">{c.state}</td>
                      <td className="py-2 text-center text-[#52525b]">{c.orders}</td>
                      <td className="py-2 text-right text-[#52525b]">{formatBRL(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lastUpdate && (
              <p className="text-xs text-[#a1a1aa] text-right mt-3">
                Última atualização: {formatDate(lastUpdate)}
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#a1a1aa]">Carregando dados...</p>
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterModal
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          compare={compare}
          onSave={({ period: p, customFrom: cf, customTo: ct, compare: c }) => {
            setPeriod(p)
            setCustomFrom(cf)
            setCustomTo(ct)
            setCompare(c)
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  )
}
