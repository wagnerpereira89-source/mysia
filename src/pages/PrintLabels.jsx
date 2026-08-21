import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import apiClient from '../api/client'
import { config } from '../config'

const LOGO_URL = config.logos.full

function getOrderType(order) {
  const lines = order.shipping_lines || []
  for (const line of lines) {
    const name = (line.method_title || '').toLowerCase()
    const id = (line.method_id || '').toLowerCase()
    if (name.includes('motoboy') || id.includes('motoboy')) return 'motoboy'
    if (name.includes('retirada') || name.includes('retira') || id.includes('local_pickup')) return 'retirada'
  }
  return 'envio'
}

function getCpf(order) {
  // Tenta várias localizações possíveis do CPF
  const metas = order.meta_data || []
  const m = metas.find((m) => m.key === '_billing_cpf' || m.key === 'billing_cpf')
  return m?.value || ''
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function PrintLabels() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const ids = params.get('ids')?.split(',').filter(Boolean) || []
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await apiClient.get(`/wp-json/wc/v3/orders/${id}`)
            return res.data
          })
        )
        setOrders(results)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    if (ids.length > 0) load()
    else setLoading(false)
  }, [])

  useEffect(() => {
    // Quando tudo carregar, abre o diálogo de impressão automaticamente
    if (!loading && orders.length > 0) {
      setTimeout(() => window.print(), 600)
    }
  }, [loading, orders])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#52525b] mt-3">Carregando etiquetas...</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <p className="text-sm text-[#52525b]">Nenhum pedido encontrado.</p>
      </div>
    )
  }

  return (
    <>
      {/* Estilos da etiqueta — copiados do plugin com ajustes */}
      <style>{`
        @media screen {
          .print-screen-controls {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: #fff; border-bottom: 1px solid #e4e4e7;
            padding: 12px 16px; display: flex; gap: 8px; align-items: center;
            max-width: 480px; margin: 0 auto;
          }
          .print-area {
            background: #f6f6f6; padding: 80px 20px 40px;
            min-height: 100vh;
          }
        }
        @media print {
          .print-screen-controls { display: none !important; }
          body, html { background: #fff !important; }
          .print-area { background: #fff !important; padding: 0 !important; }
          @page { size: 100mm 150mm; margin: 0; }
        }
        .etiqueta-sheet {
          background: #fff;
          width: 100mm;
          min-height: 150mm;
          padding: 4mm 5mm;
          margin: 0 auto 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          box-sizing: border-box;
          page-break-after: always;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
        }
        .etiqueta-sheet:last-child { page-break-after: auto; }
        .etiqueta {
          border: 1px solid #000;
          padding: 3mm;
          font-size: 8pt;
          line-height: 1.3;
        }
        .etiqueta-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3mm;
          gap: 3mm;
        }
        .etiqueta-head-info {
          font-weight: 700;
          font-size: 9pt;
          line-height: 1.35;
          flex: 1;
        }
        .etiqueta-head-info > span {
          font-weight: 400;
          font-size: 7pt;
          color: #000;
        }
        .etiqueta-logo {
          max-width: 32mm;
          max-height: 11mm;
          object-fit: contain;
          display: block;
        }
        .etiqueta-tipo {
          display: inline-block;
          padding: 1mm 2mm;
          border: 1px solid #000;
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 2mm;
        }
        .etiqueta-section {
          margin-bottom: 2.5mm;
          font-size: 8pt;
        }
        .etiqueta-section strong {
          font-weight: 700;
        }
        .etiqueta-divisor {
          border-top: 1px solid #000;
          margin: 2.5mm 0;
        }
        .etiqueta-endereco {
          font-size: 9pt;
          font-weight: 600;
          line-height: 1.4;
        }
        .etiqueta-endereco strong {
          display: block;
          font-size: 10pt;
          margin-bottom: 1mm;
        }
        .etiqueta-recibo {
          margin-top: 3mm;
          padding-top: 2mm;
          border-top: 1px solid #000;
        }
        .etiqueta-recibo-title {
          font-weight: 700;
          margin-bottom: 2.5mm;
          font-size: 8pt;
        }
        .etiqueta-linha {
          display: flex;
          gap: 2mm;
          margin-bottom: 3mm;
          align-items: flex-end;
          font-size: 7pt;
        }
        .etiqueta-linha-label {
          font-weight: 600;
          flex-shrink: 0;
        }
        .etiqueta-linha-input {
          flex: 1;
          border-bottom: 1px solid #000;
          min-height: 3mm;
        }
        .etiqueta-linha-meio {
          width: 22mm;
          border-bottom: 1px solid #000;
          min-height: 3mm;
        }
      `}</style>

      <div className="print-screen-controls">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[#52525b] hover:text-[#1a1a1a]">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex-1" />
        <span className="text-xs text-[#a1a1aa]">{orders.length} {orders.length === 1 ? 'etiqueta' : 'etiquetas'}</span>
        <button onClick={() => window.print()}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm">
          <Printer size={14} /> Imprimir
        </button>
      </div>

      <div className="print-area">
        {orders.map((order) => {
          const cliente = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'Cliente'
          const tel = order.billing?.phone || ''
          const cpf = getCpf(order)
          const dataPedido = formatDate(order.date_created)
          const tipo = getOrderType(order)
          const shipping = order.shipping_lines?.[0]?.method_title || ''
          const obsCliente = order.customer_note || ''

          // Endereço completo (para Envio e Motoboy)
          const addr = order.shipping?.address_1
            ? order.shipping
            : order.billing
          const numero = order.meta_data?.find((m) => m.key === '_billing_number' || m.key === '_shipping_number')?.value || ''
          const bairro = order.meta_data?.find((m) => m.key === '_billing_neighborhood' || m.key === '_shipping_neighborhood')?.value || ''

          const tipoLabel = {
            retirada: '🛍️ RETIRADA EM LOJA',
            envio:    '📦 ENVIO',
            motoboy:  '🛵 MOTOBOY',
          }[tipo]

          return (
            <div key={order.id} className="etiqueta-sheet">
              <div className="etiqueta">
                {/* Cabeçalho */}
                <div className="etiqueta-head">
                  <div className="etiqueta-head-info">
                    Pedido #{order.id}<br />
                    <span>Realizado em: {dataPedido}</span>
                  </div>
                  <img src={LOGO_URL} alt={config.clientName} className="etiqueta-logo"
                    crossOrigin="anonymous"
                    onError={(e) => { e.target.style.display = 'none' }} />
                </div>

                {/* Tipo */}
                <div className="etiqueta-tipo">{tipoLabel}</div>

                {/* Para retirada: ponto de retirada */}
                {tipo === 'retirada' && shipping && (
                  <div className="etiqueta-section">
                    <strong>Ponto de Retirada:</strong> {shipping}
                  </div>
                )}

                {/* Cliente */}
                <div className="etiqueta-section">
                  <strong>{tipo === 'retirada' ? 'Entregar a:' : 'Destinatário:'}</strong> {cliente}<br />
                  {tel && <><strong>Telefone:</strong> {tel}<br /></>}
                  {cpf && <><strong>CPF:</strong> {cpf}</>}
                </div>

                {/* Endereço (Motoboy e Envio) */}
                {(tipo === 'motoboy' || tipo === 'envio') && addr && (
                  <>
                    <div className="etiqueta-divisor"></div>
                    <div className="etiqueta-section">
                      <strong>Endereço de entrega:</strong>
                      <div className="etiqueta-endereco" style={{ marginTop: '1.5mm' }}>
                        {addr.address_1} {numero && `, ${numero}`}<br />
                        {bairro && <>{bairro}<br /></>}
                        {addr.address_2 && <>{addr.address_2}<br /></>}
                        {addr.city} - {addr.state} {addr.postcode && `· CEP: ${addr.postcode}`}
                      </div>
                    </div>
                  </>
                )}

                {/* Método de envio (para envio Correios) */}
                {tipo === 'envio' && shipping && (
                  <div className="etiqueta-section" style={{ marginTop: '1.5mm' }}>
                    <strong>Modalidade:</strong> {shipping}
                  </div>
                )}

                {/* Observação do cliente */}
                {obsCliente && (
                  <>
                    <div className="etiqueta-divisor"></div>
                    <div className="etiqueta-section">
                      <strong>Observação:</strong> {obsCliente}
                    </div>
                  </>
                )}

                {/* Campo de retirada (só para retirada em loja) */}
                {tipo === 'retirada' && (
                  <div className="etiqueta-recibo">
                    <div className="etiqueta-recibo-title">Dados de quem retirou:</div>
                    <div className="etiqueta-linha">
                      <span className="etiqueta-linha-label">Nome completo:</span>
                      <span className="etiqueta-linha-input"></span>
                    </div>
                    <div className="etiqueta-linha">
                      <span className="etiqueta-linha-label">CPF:</span>
                      <span className="etiqueta-linha-meio"></span>
                      <span className="etiqueta-linha-label" style={{ marginLeft: '6mm' }}>Data:</span>
                      <span className="etiqueta-linha-meio"></span>
                    </div>
                    <div className="etiqueta-linha">
                      <span className="etiqueta-linha-label">Assinatura:</span>
                      <span className="etiqueta-linha-input"></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
