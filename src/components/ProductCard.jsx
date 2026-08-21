import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Package, Eye, EyeOff, Trash2, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateVariation } from '../api/variations'
import { updateProduct, deleteProduct } from '../api/products'
import { formatStock, buildVariationName } from '../utils/formatters'
import toast from 'react-hot-toast'

function StockInput({ productId, variation }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(
    variation.stock_quantity !== null ? String(variation.stock_quantity) : ''
  )
  const [saved, setSaved] = useState(false)
  const inputRef = useRef(null)

  const mutation = useMutation({
    mutationFn: (qty) =>
      updateVariation(productId, variation.id, {
        stock_quantity: qty === '' ? null : Number(qty),
        manage_stock: qty !== '',
      }),
    onMutate: async (qty) => {
      await queryClient.cancelQueries({ queryKey: ['variations', productId] })
      const prev = queryClient.getQueryData(['variations', productId])
      queryClient.setQueryData(['variations', productId], (old) =>
        old?.map((v) =>
          v.id === variation.id ? { ...v, stock_quantity: qty === '' ? null : Number(qty) } : v
        )
      )
      return { prev }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['variations', productId], ctx.prev)
      setValue(variation.stock_quantity !== null ? String(variation.stock_quantity) : '')
      toast.error('Erro ao salvar estoque')
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      queryClient.invalidateQueries({ queryKey: ['variations', productId] })
    },
  })

  const handleBlur = () => {
    const current = variation.stock_quantity !== null ? String(variation.stock_quantity) : ''
    if (value !== current) mutation.mutate(value)
  }

  return (
    <input
      ref={inputRef}
      type="number"
      value={value}
      placeholder="∞"
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className={`w-16 h-7 px-2 text-sm text-center border rounded-lg outline-none transition-colors
        ${saved ? 'border-green-500 bg-green-50' : 'border-[#e4e4e7] focus:border-primary'}`}
    />
  )
}

function VariationRow({ productId, variation, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const name = buildVariationName(variation)

  return (
    <div className="flex items-center gap-2 py-2 border-t border-[#f4f4f5] first:border-0">
      <StockInput productId={productId} variation={variation} />
      <span className="flex-1 text-sm text-[#52525b] truncate">{name}</span>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1 rounded text-[#a1a1aa] hover:text-[#52525b]"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#e4e4e7] rounded-xl shadow-lg z-10 min-w-[140px]">
            <button
              onClick={() => { onEdit(variation); setMenuOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[#f4f4f5]"
            >
              Editar variação
            </button>
            <button
              onClick={() => { onDelete(variation); setMenuOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#f4f4f5]"
            >
              Excluir variação
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProductCard({ product, variations = [], onEditVariation, onDeleteVariation }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const thumb = product.images?.[0]?.src
  const isHidden = product.status === 'draft' || product.status === 'private'

  const toggleStatusMut = useMutation({
    mutationFn: () => updateProduct(product.id, { status: isHidden ? 'publish' : 'draft' }),
    onSuccess: () => {
      toast.success(isHidden ? 'Produto publicado' : 'Produto ocultado do site')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Erro ao atualizar produto'),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: () => {
      toast.success('Produto excluído')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Erro ao excluir produto'),
  })

  const handleToggleHide = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    toggleStatusMut.mutate()
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    setConfirmDelete(true)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    navigate(`/products/${product.id}/edit`)
  }

  return (
    <>
      <div className={`bg-white border border-[#e4e4e7] rounded-xl overflow-hidden ${isHidden ? 'opacity-60' : ''}`}>
        {/* Main row */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#f4f4f5] relative">
            {thumb ? (
              <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#a1a1aa]">
                <Package size={20} />
              </div>
            )}
            {isHidden && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <EyeOff size={16} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}/edit`) }}
              className="text-action text-sm font-medium hover:underline text-left truncate max-w-full block"
            >
              {product.name}
            </button>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              {product.type === 'variable' ? `${variations.length} variações` : 'Produto simples'}
              {isHidden && <span className="ml-2 text-[#f59e0b]">· Oculto</span>}
            </p>
          </div>

          {/* Menu de ações */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-[#a1a1aa] hover:bg-[#f4f4f5]"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#e4e4e7] rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden">
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm hover:bg-[#f4f4f5]"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={handleToggleHide}
                    disabled={toggleStatusMut.isPending}
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm hover:bg-[#f4f4f5] disabled:opacity-50"
                  >
                    {isHidden ? <><Eye size={14} /> Mostrar no site</> : <><EyeOff size={14} /> Ocultar no site</>}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t border-[#f4f4f5]"
                  >
                    <Trash2 size={14} /> Apagar produto
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="p-1 text-[#a1a1aa]">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Variations */}
        {expanded && variations.length > 0 && (
          <div className="px-3 pb-3 border-t border-[#f4f4f5]">
            {variations.map((v) => (
              <VariationRow
                key={v.id}
                productId={product.id}
                variation={v}
                onEdit={onEditVariation}
                onDelete={onDeleteVariation}
              />
            ))}
          </div>
        )}
        {expanded && variations.length === 0 && (
          <div className="px-3 pb-3 pt-2 border-t border-[#f4f4f5]">
            <p className="text-sm text-[#a1a1aa]">Sem variações</p>
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-[#1a1a1a]">Apagar produto?</h3>
            </div>
            <p className="text-sm text-[#52525b] mb-5">
              "{product.name}" será removido permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 border border-[#e4e4e7] rounded-xl text-sm text-[#52525b] hover:bg-[#f4f4f5]"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmDelete(false); deleteMut.mutate() }}
                disabled={deleteMut.isPending}
                className="flex-1 h-10 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
