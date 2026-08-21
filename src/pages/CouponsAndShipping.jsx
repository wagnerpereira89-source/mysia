import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Edit2, Trash2, Tag, Truck, X, ChevronDown,
  Calendar, RefreshCw, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../api/coupons'
import { getAllOrders } from '../api/orders'
import { config } from '../config'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(d))
}

function isExpired(coupon) {
  if (!coupon.date_expires) return false
  return new Date(coupon.date_expires) < new Date()
}

function getPeriodDates(period, customFrom, customTo) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'today') {
    return { after: today.toISOString(), before: new Date(today.getTime() + 86400000).toISOString(), label: 'Hoje' }
  }
  if (period === 'week') {
    const start = new Date(today); start.setDate(today.getDate() - today.getDay())
    return { after: start.toISOString(), before: new Date(today.getTime() + 86400000).toISOString(), label: 'Semana atual' }
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { after: start.toISOString(), before: new Date(today.getTime() + 86400000).toISOString(), label: 'Mês atual' }
  }
  if (period === 'custom' && customFrom && customTo) {
    const from = new Date(customFrom); const to = new Date(customTo); to.setDate(to.getDate() + 1)
    return { after: from.toISOString(), before: to.toISOString(), label: 'Personalizado' }
  }
  return getPeriodDates('month', null, null)
}

function discountTypeLabel(type) {
  return {
    percent:           '% Desconto',
    fixed_cart:        'R$ no carrinho',
    fixed_product:     'R$ no produto',
  }[type] || type
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function CouponsAndShipping() {
  const [tab, setTab] = useState('coupons') // 'coupons' | 'shipping'

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
        <h1 className="text-base font-bold text-[#1a1a1a]">Cupons & Frete</h1>
      </header>

      {/* Sub-abas */}
      <div className="sticky top-20 z-30 bg-white border-b border-[#e4e4e7] px-4">
        <div className="max-w-mobile mx-auto flex gap-1">
          <button
            onClick={() => setTab('coupons')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${tab === 'coupons' ? 'border-primary text-primary' : 'border-transparent text-[#a1a1aa]'}`}>
            <Tag size={16} /> Cupons
          </button>
          <button
            onClick={() => setTab('shipping')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${tab === 'shipping' ? 'border-primary text-primary' : 'border-transparent text-[#a1a1aa]'}`}>
            <Truck size={16} /> Frete
          </button>
        </div>
      </div>

      <div className="max-w-mobile mx-auto px-4 pb-28 py-4">
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'shipping' && <ShippingTab />}
      </div>
    </div>
  )
}

// ─── Aba CUPONS ──────────────────────────────────────────────────────────────

function CouponsTab() {
  const [coupons, setCoupons]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showExpired, setShowExpired] = useState(false)
  const [editing, setEditing]   = useState(null) // null | 'new' | coupon object

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCoupons({ per_page: 100 })
      setCoupons(data || [])
    } catch (e) {
      toast.error('Erro ao carregar cupons')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = coupons.filter((c) => {
    if (!showExpired && isExpired(c)) return false
    if (search) {
      const s = search.toLowerCase()
      return (c.code || '').toLowerCase().includes(s)
    }
    return true
  })

  const handleSave = async (payload, id) => {
    try {
      if (id) {
        await updateCoupon(id, payload)
        toast.success('Cupom atualizado!')
      } else {
        await createCoupon(payload)
        toast.success('Cupom criado!')
      }
      setEditing(null)
      load()
    } catch (e) {
      const msg = e.response?.data?.message || 'Erro ao salvar cupom'
      toast.error(msg)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Apagar este cupom?')) return
    try {
      await deleteCoupon(id)
      toast.success('Cupom apagado')
      load()
    } catch {
      toast.error('Erro ao apagar')
    }
  }

  return (
    <div className="space-y-3">
      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
        <input
          type="text"
          placeholder="Buscar por código..."
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary"
        />
      </div>

      {/* Toggle expirados + Novo */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)}
            className="w-4 h-4 accent-primary" />
          <span className="text-sm text-[#52525b]">Mostrar expirados</span>
        </label>
        <button onClick={() => setEditing('new')}
          className="h-10 px-4 bg-primary text-white rounded-xl text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Novo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-8 text-center">
          <Tag size={32} className="mx-auto text-[#d4d4d8] mb-2" />
          <p className="text-sm text-[#52525b]">Nenhum cupom encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CouponCard key={c.id} coupon={c}
              onEdit={() => setEditing(c)}
              onDelete={() => handleDelete(c.id)} />
          ))}
        </div>
      )}

      {editing && (
        <CouponEditor
          coupon={editing === 'new' ? null : editing}
          onSave={(payload) => handleSave(payload, editing === 'new' ? null : editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function CouponCard({ coupon, onEdit, onDelete }) {
  const expired = isExpired(coupon)
  const used    = coupon.usage_count || 0
  const limit   = coupon.usage_limit || 0
  const isFree  = coupon.free_shipping

  return (
    <div className={`bg-white rounded-2xl border p-4 ${expired ? 'border-[#e4e4e7] opacity-60' : 'border-[#e4e4e7]'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-base font-bold text-primary tracking-wide">{coupon.code}</code>
            {expired && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">EXPIRADO</span>}
            {isFree && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">FRETE GRÁTIS</span>}
          </div>
          <div className="text-sm text-[#52525b]">
            {coupon.discount_type === 'percent' ? `${coupon.amount}% de desconto` : `${formatBRL(coupon.amount)} (${discountTypeLabel(coupon.discount_type)})`}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="w-8 h-8 rounded-lg hover:bg-[#f4f4f5] flex items-center justify-center text-[#52525b]">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a1a1aa]">
        {coupon.minimum_amount > 0 && <span>Mín: {formatBRL(coupon.minimum_amount)}</span>}
        <span>Usados: {used}{limit > 0 ? `/${limit}` : ''}</span>
        {coupon.date_expires && <span>Expira: {formatDate(coupon.date_expires)}</span>}
      </div>
    </div>
  )
}

function CouponEditor({ coupon, onSave, onClose }) {
  const [code, setCode]             = useState(coupon?.code || '')
  const [discountType, setDT]       = useState(coupon?.discount_type || 'percent')
  const [amount, setAmount]         = useState(coupon?.amount || '')
  const [freeShipping, setFree]     = useState(coupon?.free_shipping || false)
  const [minAmount, setMin]         = useState(coupon?.minimum_amount || '')
  const [usageLimit, setLimit]      = useState(coupon?.usage_limit || '')
  const [dateExpires, setExpires]   = useState(coupon?.date_expires ? coupon.date_expires.slice(0, 10) : '')
  const [individualUse, setIndiv]   = useState(coupon?.individual_use || false)
  const [saving, setSaving]         = useState(false)

  const handleSubmit = async () => {
    if (!code.trim()) return toast.error('Digite um código')
    if (!amount && !freeShipping) return toast.error('Digite um valor ou marque frete grátis')

    setSaving(true)
    const payload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      amount: String(amount || '0'),
      free_shipping: freeShipping,
      minimum_amount: String(minAmount || '0'),
      individual_use: individualUse,
    }
    if (usageLimit) payload.usage_limit = parseInt(usageLimit, 10)
    if (dateExpires) payload.date_expires = dateExpires + 'T23:59:59'

    await onSave(payload)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white w-full max-w-mobile rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1a1a1a]">{coupon ? 'Editar cupom' : 'Novo cupom'}</h2>
          <button onClick={onClose} className="text-[#a1a1aa]"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          {/* Código */}
          <div>
            <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Código do cupom *</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EX: PRIMEIRA10" disabled={!!coupon}
              className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary disabled:bg-[#f4f4f5] disabled:text-[#a1a1aa] uppercase" />
            {coupon && <p className="text-[10px] text-[#a1a1aa] mt-1">O código não pode ser alterado depois de criado</p>}
          </div>

          {/* Tipo de desconto */}
          <div>
            <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Tipo de desconto</label>
            <div className="relative">
              <select value={discountType} onChange={(e) => setDT(e.target.value)}
                className="w-full h-11 px-3 pr-10 text-sm bg-white border border-[#e4e4e7] rounded-xl appearance-none focus:outline-none focus:border-primary">
                <option value="percent">% Porcentagem</option>
                <option value="fixed_cart">R$ Fixo no carrinho</option>
                <option value="fixed_product">R$ Fixo por produto</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="text-[12px] font-medium text-[#52525b] mb-1 block">
              Valor do desconto {discountType === 'percent' ? '(%)' : '(R$)'}
            </label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '20,00'}
              className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary" />
          </div>

          {/* Frete grátis */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={freeShipping} onChange={(e) => setFree(e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <span className="text-sm text-[#1a1a1a]">Conceder frete grátis</span>
          </label>

          {/* Uso individual */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={individualUse} onChange={(e) => setIndiv(e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <span className="text-sm text-[#1a1a1a]">Uso individual (não combina com outros cupons)</span>
          </label>

          {/* Valor mínimo */}
          <div>
            <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Valor mínimo do pedido (R$)</label>
            <input type="number" step="0.01" min="0" value={minAmount} onChange={(e) => setMin(e.target.value)}
              placeholder="0,00 (sem mínimo)"
              className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary" />
          </div>

          {/* Limite de uso */}
          <div>
            <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Limite total de usos</label>
            <input type="number" min="0" value={usageLimit} onChange={(e) => setLimit(e.target.value)}
              placeholder="Sem limite"
              className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary" />
          </div>

          {/* Validade */}
          <div>
            <label className="text-[12px] font-medium text-[#52525b] mb-1 block">Data de expiração</label>
            <input type="date" value={dateExpires} onChange={(e) => setExpires(e.target.value)}
              className="w-full h-11 px-3 text-sm border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-11 border border-[#e4e4e7] rounded-xl text-sm text-[#52525b]">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-11 bg-primary text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Aba FRETE ───────────────────────────────────────────────────────────────

function ShippingTab() {
  const [period, setPeriod] = useState('month')
  const [customFrom, setCF] = useState('')
  const [customTo, setCT]   = useState('')
  const [filterOpen, setFO] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])

  const periodDates = getPeriodDates(period, customFrom, customTo)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllOrders({ after: periodDates.after, before: periodDates.before })
      setOrders(data || [])
    } catch {
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [period, customFrom, customTo])

  useEffect(() => { load() }, [load])

  // Agrupa frete por método
  const shippingByMethod = (() => {
    const map = {}
    let totalShipping = 0
    let withShipping  = 0
    orders.forEach((o) => {
      const lines = o.shipping_lines || []
      lines.forEach((line) => {
        const method = (line.method_title || 'Outros').trim()
        const total  = parseFloat(line.total || 0)
        if (!map[method]) map[method] = { method, total: 0, count: 0 }
        map[method].total += total
        map[method].count += 1
        totalShipping += total
      })
      if (lines.length > 0) withShipping++
    })
    return {
      list: Object.values(map).sort((a, b) => b.total - a.total),
      total: totalShipping,
      avg:   withShipping > 0 ? totalShipping / withShipping : 0,
      withShipping,
    }
  })()

  return (
    <div className="space-y-4">
      {/* Filtro de período */}
      <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#1a1a1a]">{periodDates.label}</p>
          <p className="text-xs text-[#a1a1aa] mt-0.5">{orders.length} pedidos analisados</p>
        </div>
        <button onClick={() => setFO(true)}
          className="h-9 w-9 bg-[#f4f4f5] rounded-xl flex items-center justify-center text-[#52525b]">
          <Calendar size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
              <p className="text-xs text-[#a1a1aa] mb-1">Total em frete</p>
              <p className="text-lg font-bold text-[#1a1a1a]">{formatBRL(shippingByMethod.total)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
              <p className="text-xs text-[#a1a1aa] mb-1">Frete médio</p>
              <p className="text-lg font-bold text-[#1a1a1a]">{formatBRL(shippingByMethod.avg)}</p>
            </div>
          </div>

          {/* Lista por método */}
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-4">
            <p className="text-base font-bold text-[#1a1a1a] mb-1">Por método de envio</p>
            <p className="text-xs text-[#a1a1aa] mb-4">{periodDates.label}</p>
            {shippingByMethod.list.length === 0 ? (
              <p className="text-sm text-[#a1a1aa] text-center py-4">Nenhum frete neste período</p>
            ) : (
              <div className="space-y-4">
                {shippingByMethod.list.map((m) => {
                  const pct = shippingByMethod.total > 0 ? (m.total / shippingByMethod.total) * 100 : 0
                  return (
                    <div key={m.method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#1a1a1a] truncate max-w-[200px]">{m.method}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#1a1a1a]">{formatBRL(m.total)}</span>
                          <p className="text-xs text-[#a1a1aa]">{m.count}x · {pct.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="h-2 bg-[#f4f4f5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {filterOpen && (
        <PeriodModal
          period={period} customFrom={customFrom} customTo={customTo}
          onSave={({ period: p, customFrom: cf, customTo: ct }) => {
            setPeriod(p); setCF(cf); setCT(ct)
          }}
          onClose={() => setFO(false)}
        />
      )}
    </div>
  )
}

function PeriodModal({ period, customFrom, customTo, onSave, onClose }) {
  const [p, setP] = useState(period)
  const [from, setFrom] = useState(customFrom || new Date().toISOString().slice(0, 10))
  const [to, setTo]     = useState(customTo || new Date().toISOString().slice(0, 10))

  const handleSave = () => {
    onSave({ period: p, customFrom: from, customTo: to })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white w-full max-w-mobile rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1a1a1a]">Período</h2>
          <button onClick={onClose} className="text-[#a1a1aa]"><X size={20} /></button>
        </div>

        <div className="relative mb-4">
          <select value={p} onChange={(e) => setP(e.target.value)}
            className="w-full h-11 px-3 pr-10 text-sm bg-white border-2 border-primary rounded-xl appearance-none focus:outline-none">
            <option value="today">Hoje</option>
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
