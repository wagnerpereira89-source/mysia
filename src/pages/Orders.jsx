import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, MessageCircle, ChevronDown, ChevronUp, RefreshCw, Store, Package, Bike, LayoutGrid, Check, Loader2, Printer, CheckSquare, Square } from 'lucide-react'
import {
  getOrdersByStatus, updateOrderStatus, batchUpdateOrderStatus,
  getStatusCounts, getOrderType, getNextStatus, getBackStatus, ORDER_STATUSES,
} from '../api/orders'
import toast from 'react-hot-toast'
import { config } from '../config'

const LOGO_URL = config.logos.full

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v || 0))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr))
}

function cleanPhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

function formatPhone(phone) {
  const c = cleanPhone(phone)
  if (c.length === 11) return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`
  if (c.length === 10) return `(${c.slice(0,2)}) ${c.slice(2,6)}-${c.slice(6)}`
  return phone || ''
}

const TIPOS = [
  { key: 'todos',    label: 'Todos',    Icon: LayoutGrid },
  { key: 'retirada', label: 'Retirada', Icon: Store },
  { key: 'envio',    label: 'Envio',    Icon: Package },
  { key: 'motoboy',  label: 'Motoboy',  Icon: Bike },
]

function OrderCard({ order, tipo, selected, onToggleSelect, onChangeStatus, onPrint, processing }) {
  const [expanded, setExpanded] = useState(false)
  const status = ORDER_STATUSES.find((s) => s.key === order.status)
  const next = getNextStatus(order.status, getOrderType(order))
  const back = getBackStatus(order.status)
  const cliente = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'Cliente'
  const phone = order.billing?.phone || ''
  const phoneClean = cleanPhone(phone)
  const items = order.line_items || []
  const qtdTotal = items.reduce((sum, i) => sum + (i.quantity || 0), 0)
  const orderType = getOrderType(order)
  const shippingLabel = order.shipping_lines?.[0]?.method_title || 'Sem entrega'
  const payment = order.payment_method_title || order.payment_method || '—'

  // Status onde mostrar botão "Imprimir etiqueta"
  const canPrint = ['embalado', 'pronto-retirada', 'pronto-envio', 'retirado', 'enviado'].includes(order.status)

  const typePill = {
    retirada: { icon: '🛍️', label: 'Retirada', bg: '#fef3c7', color: '#92400e' },
    envio:    { icon: '📦', label: 'Envio',    bg: '#dbeafe', color: '#1e40af' },
    motoboy:  { icon: '🛵', label: 'Motoboy',  bg: '#fce7f3', color: '#9d174d' },
  }[orderType]

  return (
    <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4">
      {/* Header com checkbox, #ID, status */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(order.id)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-bold text-[#1a1a1a]">#{order.id}</span>
        </label>
        {status && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={{ background: `${status.color}20`, color: status.color, borderColor: `${status.color}50` }}
          >
            {status.label}
          </span>
        )}
      </div>

      {/* Cliente */}
      <div className="mb-3">
        <p className="text-base font-semibold text-[#1a1a1a]">{cliente}</p>
        {phoneClean && (
          <a
            href={`https://wa.me/55${phoneClean}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#22c55e] mt-0.5"
          >
            <MessageCircle size={12} /> {formatPhone(phone)}
          </a>
        )}
      </div>

      {/* Info grid */}
      <div className="space-y-1.5 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#52525b]">Tipo</span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: typePill.bg, color: typePill.color }}
          >
            {typePill.icon} {typePill.label}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#52525b]">Itens</span>
          <span className="text-[#1a1a1a]">{qtdTotal} {qtdTotal === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#52525b]">Total</span>
          <span className="font-semibold text-[#1a1a1a]">{formatBRL(order.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#52525b]">Pagamento</span>
          <span className="text-[#1a1a1a] text-xs text-right max-w-[60%]">{payment}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#52525b]">{orderType === 'retirada' ? 'Local' : 'Entrega'}</span>
          <span className="text-[#1a1a1a] text-xs text-right max-w-[60%]">{shippingLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#52525b]">Data</span>
          <span className="text-[#1a1a1a] text-xs">{formatDate(order.date_created)}</span>
        </div>
      </div>

      {/* Itens expansíveis */}
      {items.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-action hover:underline"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Ver {items.length} {items.length === 1 ? 'produto' : 'produtos'}
          </button>
          {expanded && (
            <div className="mt-3 space-y-3 pl-2">
              {items.map((item) => {
                const img = item.image?.src
                const meta = (item.meta_data || []).filter((m) => !m.key.startsWith('_'))
                return (
                  <div key={item.id} className="flex gap-3 items-start">
                    {img && (
                      <img src={img} alt={item.name}
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] leading-snug">{item.name}</p>
                      {meta.map((m, i) => (
                        <p key={i} className="text-xs text-[#52525b] mt-0.5">
                          {m.display_key || m.key}: <strong>{m.display_value || m.value}</strong>
                        </p>
                      ))}
                      <p className="text-xs text-[#52525b] mt-0.5">Qtd: <strong>{item.quantity}</strong></p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col gap-2 pt-3 border-t border-[#f4f4f5]">
        {next && (
          <button
            onClick={() => onChangeStatus(order.id, next.key)}
            disabled={processing}
            className="w-full h-10 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#2a3929] disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {next.label}
          </button>
        )}
        {canPrint && (
          <button
            onClick={() => onPrint([order.id])}
            className="w-full h-10 bg-white border border-primary text-primary rounded-xl text-sm font-medium hover:bg-primary/5 flex items-center justify-center gap-1"
          >
            <Printer size={14} /> Imprimir etiqueta
          </button>
        )}
        {back && (
          <button
            onClick={() => onChangeStatus(order.id, back.key)}
            disabled={processing}
            className="w-full h-9 border border-[#e4e4e7] text-[#52525b] rounded-xl text-sm hover:bg-[#f4f4f5] disabled:opacity-50"
          >
            ← {back.label}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Orders() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('todos')
  const [status, setStatus] = useState('processing')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({})
  const [processingId, setProcessingId] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Load orders
  const loadOrders = async () => {
    setLoading(true)
    try {
      // Detecta o tipo da busca:
      // - Só dígitos (1-6 caracteres): número do pedido → ignora status, usa include
      // - Só dígitos (7+ caracteres) ou com máscara de CPF: CPF → ignora status, usa cpf=
      // - Com letras ou vazia: busca por nome/email pelo parâmetro search padrão
      const term = debouncedSearch.trim()
      const onlyDigits = term.replace(/\D/g, '')
      const onlyDigitsAndMask = term.replace(/[\d.\-\s#]/g, '').length === 0

      const isOrderNumberSearch = term.length > 0 && onlyDigitsAndMask && onlyDigits.length >= 1 && onlyDigits.length <= 6
      const isCpfSearch         = term.length > 0 && onlyDigitsAndMask && onlyDigits.length >= 7

      let queryStatus = status
      let params      = { search: term }

      if (isOrderNumberSearch) {
        queryStatus = 'any'
        params      = { include: onlyDigits }
      } else if (isCpfSearch) {
        queryStatus = 'any'
        params      = { cpf: onlyDigits }
      }

      const data = await getOrdersByStatus(queryStatus, params)
      setOrders(data)
    } catch {
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Load counts
  const loadCounts = async () => {
    try {
      const c = await getStatusCounts()
      setCounts(c)
    } catch {}
  }

  useEffect(() => { loadOrders() }, [status, debouncedSearch])
  useEffect(() => { loadCounts() }, [])

  // Filter by tipo (client-side because depends on shipping_method)
  const filteredOrders = useMemo(() => {
    if (tipo === 'todos') return orders
    return orders.filter((o) => getOrderType(o) === tipo)
  }, [orders, tipo])

  const handleChangeStatus = async (orderId, newStatus) => {
    setProcessingId(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      toast.success('Status atualizado!')
      await loadOrders()
      await loadCounts()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const selectAll = () => {
    setSelected(new Set(filteredOrders.map((o) => o.id)))
  }

  const handlePrint = (orderIds) => {
    const ids = orderIds.join(',')
    navigate(`/orders/print?ids=${ids}`)
  }

  const handleBulkApply = async () => {
    if (selected.size === 0 || !bulkStatus) return
    setBulkProcessing(true)
    try {
      await batchUpdateOrderStatus([...selected], bulkStatus)
      toast.success(`${selected.size} pedidos atualizados!`)
      clearSelection()
      setBulkStatus('')
      await loadOrders()
      await loadCounts()
    } catch {
      toast.error('Erro ao atualizar em massa')
    } finally {
      setBulkProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header igual aos outros */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e4e4e7] px-4 h-20 flex items-center gap-3">
        <img
          src={LOGO_URL}
          alt={config.clientName}
          className="h-14 w-auto object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div className="w-px h-8 bg-[#e4e4e7]" />
        <h1 className="text-base font-bold text-[#1a1a1a]">Pedidos</h1>
        <div className="flex-1" />
        <button onClick={() => { loadOrders(); loadCounts() }} disabled={loading}
          className="p-2 rounded-lg text-[#52525b] hover:bg-[#f4f4f5] disabled:opacity-40">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="max-w-mobile mx-auto px-4 pb-32 pt-3">
        {/* Tabs de tipo */}
        <div className="grid grid-cols-4 gap-1 mb-3 bg-white border border-[#e4e4e7] rounded-xl p-1">
          {TIPOS.map((t) => {
            const active = tipo === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                  active ? 'bg-primary text-white' : 'text-[#52525b] hover:bg-[#f4f4f5]'
                }`}
              >
                <t.Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Busca */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar #pedido, CPF, nome ou email..."
            className="w-full h-10 pl-9 pr-9 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary placeholder:text-[#a1a1aa]"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros por status (scroll horizontal) */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4">
          {ORDER_STATUSES.map((s) => {
            const active = status === s.key
            const count = counts[s.key] || 0
            return (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={`flex-shrink-0 px-3 h-9 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  active ? 'text-white' : 'bg-white border border-[#e4e4e7] text-[#52525b]'
                }`}
                style={active ? { background: s.color } : {}}
              >
                {s.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-[#f4f4f5] text-[#52525b]'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Lista de pedidos */}
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm text-[#a1a1aa]">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-8 text-center">
            <p className="text-sm text-[#a1a1aa]">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <>
            {/* Botão Selecionar todos */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={selected.size === filteredOrders.length ? clearSelection : selectAll}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                {selected.size === filteredOrders.length
                  ? <><CheckSquare size={16} /> Desmarcar todos</>
                  : <><Square size={16} /> Selecionar todos ({filteredOrders.length})</>
                }
              </button>
              <span className="text-xs text-[#a1a1aa]">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>

            <div className="space-y-3">
              {filteredOrders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  tipo={tipo}
                  selected={selected.has(o.id)}
                  onToggleSelect={toggleSelect}
                  onChangeStatus={handleChangeStatus}
                  onPrint={handlePrint}
                  processing={processingId === o.id}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Barra de ação em massa */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-[#e4e4e7] p-3 shadow-lg max-w-mobile mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {selected.size} {selected.size === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <div className="flex-1" />
            <button onClick={clearSelection}
              className="text-xs text-[#a1a1aa] hover:text-[#52525b]">Limpar</button>
          </div>

          {/* Imprimir selecionados */}
          <button
            onClick={() => handlePrint([...selected])}
            className="w-full h-10 mb-2 bg-white border border-primary text-primary rounded-xl text-sm font-medium flex items-center justify-center gap-1"
          >
            <Printer size={14} /> Imprimir etiquetas ({selected.size})
          </button>

          <div className="flex gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="flex-1 h-10 px-3 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary"
            >
              <option value="">Mudar status para...</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkApply}
              disabled={!bulkStatus || bulkProcessing}
              className="h-10 px-4 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {bulkProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
