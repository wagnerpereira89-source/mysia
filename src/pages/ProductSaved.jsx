import { useState, useEffect } from 'react'
import { CheckCircle, MoreVertical, Star, Eye, EyeOff, Truck, Share2, Copy, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProduct, updateProduct, deleteProduct } from '../api/products'
import { getProducts } from '../api/products'
import { Header } from '../components/Header'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Sheet } from '../components/ui/Sheet'
import toast from 'react-hot-toast'

function ProductSearchModal({ open, onClose, onSelect, excludeId }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])

  const { data } = useQuery({
    queryKey: ['products-search', search],
    queryFn: () => getProducts({ search, per_page: 20 }),
    enabled: open,
  })

  const products = data?.data.filter((p) => p.id !== excludeId) ?? []

  const toggle = (p) => {
    setSelected((prev) =>
      prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    )
  }

  const confirm = () => { onSelect(selected); setSelected([]); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title="Adicionar produtos">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar produtos..."
        className="w-full h-10 px-3 text-sm border border-[#e4e4e7] rounded-xl mb-4 focus:outline-none focus:border-primary"
      />
      <div className="space-y-1 mb-4">
        {products.map((p) => {
          const isSel = selected.some((x) => x.id === p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${isSel ? 'bg-primary/10' : 'hover:bg-[#f4f4f5]'}`}
            >
              {p.images?.[0] && (
                <img src={p.images[0].src} alt="" className="w-10 h-10 rounded object-cover" />
              )}
              <span className="flex-1 text-sm text-left text-[#1a1a1a]">{p.name}</span>
              {isSel && <CheckCircle size={16} className="text-primary" />}
            </button>
          )
        })}
      </div>
      <Button fullWidth onClick={confirm}>Confirmar ({selected.length})</Button>
    </Sheet>
  )
}

export default function ProductSaved() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    staleTime: 0,
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [upsellModal, setUpsellModal] = useState(false)
  const [crossSellModal, setCrossSellModal] = useState(false)
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [freeShipping, setFreeShipping] = useState(false)
  const [published, setPublished] = useState(product?.status === 'publish')

  useEffect(() => {
    if (product) {
      setFeatured(product.featured)
      setPublished(product.status === 'publish')
      setFreeShipping(product.meta_data?.find((m) => m.key === '_free_shipping')?.value === 'yes')
    }
  }, [product])

  const updateMut = useMutation({
    mutationFn: (data) => updateProduct(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product', id] }),
    onError: () => toast.error('Erro ao atualizar produto'),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produto excluído')
      navigate('/inventory')
    },
    onError: () => toast.error('Erro ao excluir produto'),
  })

  const toggleFeatured = () => {
    setFeatured((v) => !v)
    updateMut.mutate({ featured: !featured })
  }

  const togglePublished = () => {
    const newStatus = published ? 'private' : 'publish'
    setPublished((v) => !v)
    updateMut.mutate({ status: newStatus })
  }

  const toggleFreeShipping = () => {
    setFreeShipping((v) => !v)
    updateMut.mutate({
      meta_data: [{ key: '_free_shipping', value: freeShipping ? '' : 'yes' }],
    })
  }

  const addUpsell = (products) => {
    const ids = [...(product?.upsell_ids || []), ...products.map((p) => p.id)]
    updateMut.mutate({ upsell_ids: ids })
  }

  const addCrossSell = (products) => {
    const ids = [...(product?.cross_sell_ids || []), ...products.map((p) => p.id)]
    updateMut.mutate({ cross_sell_ids: ids })
  }

  if (!product) return null

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        title="Produto salvo"
        right={
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-2 rounded-lg text-[#52525b] hover:bg-[#f4f4f5]"
              >
                <MoreVertical size={20} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#e4e4e7] rounded-xl shadow-lg z-10 min-w-[160px]">
                  <button
                    onClick={() => { navigator.share?.({ title: product.name, url: product.permalink }); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#f4f4f5]"
                  >
                    <Share2 size={14} /> Compartilhar link
                  </button>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(product.permalink); toast.success('Link copiado!'); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#f4f4f5]"
                  >
                    <Copy size={14} /> Copiar link
                  </button>
                  <button
                    onClick={() => { if (confirm('Excluir produto?')) deleteMut.mutate(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-[#f4f4f5]"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      <div className="max-w-mobile mx-auto px-4 py-4 pb-32 space-y-4">
        {/* Destacar produto */}
        <Card>
          <CardTitle>Destacar produto</CardTitle>
          <p className="text-sm text-[#52525b] mb-3">
            Escolha em quais seções da sua loja você quer destacar este produto.
          </p>
          <button
            onClick={toggleFeatured}
            className={`flex items-center gap-2 text-sm font-medium ${featured ? 'text-yellow-500' : 'text-action'}`}
          >
            <Star size={16} fill={featured ? 'currentColor' : 'none'} />
            {featured ? 'Produto destacado' : '+ Destacar produto'}
          </button>
        </Card>

        {/* Produtos relacionados */}
        <Card>
          <CardTitle>Produtos relacionados</CardTitle>

          {/* Alternativos (upsell) */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#1a1a1a] mb-1">Alternativos</p>
            <p className="text-sm text-[#52525b] mb-2">
              Podem ser opções similares a este produto. Exemplo: uma blusa lisa e uma estampada.
            </p>
            <button
              onClick={() => setUpsellModal(true)}
              className="text-sm text-action hover:underline"
            >
              + Adicionar produtos
            </button>
            {product.upsell_ids?.length > 0 && (
              <p className="text-xs text-[#a1a1aa] mt-1">{product.upsell_ids.length} produto(s) adicionado(s)</p>
            )}
          </div>

          {/* Complementares (cross-sell) */}
          <div>
            <p className="text-sm font-semibold text-[#1a1a1a] mb-1">Complementares</p>
            <p className="text-sm text-[#52525b] mb-2">
              Podem ser opções a combinar com este produto. Exemplo: uma blusa e uma calça.
            </p>
            <button
              onClick={() => setCrossSellModal(true)}
              className="text-sm text-action hover:underline"
            >
              + Adicionar produtos
            </button>
            {product.cross_sell_ids?.length > 0 && (
              <p className="text-xs text-[#a1a1aa] mt-1">{product.cross_sell_ids.length} produto(s) adicionado(s)</p>
            )}
          </div>
        </Card>

        {/* Toggles */}
        <Card>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[#52525b]" />
                <span className="text-sm text-[#1a1a1a]">Esse produto possui frete grátis</span>
              </div>
              <input
                type="checkbox"
                checked={freeShipping}
                onChange={toggleFreeShipping}
                className="w-5 h-5 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2">
                {published ? <Eye size={16} className="text-[#52525b]" /> : <EyeOff size={16} className="text-[#a1a1aa]" />}
                <span className="text-sm text-[#1a1a1a]">Exibir na minha loja</span>
              </div>
              <input
                type="checkbox"
                checked={published}
                onChange={togglePublished}
                className="w-5 h-5 accent-primary"
              />
            </label>
          </div>
        </Card>
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#e4e4e7] flex gap-3 max-w-mobile mx-auto">
        <Button variant="secondary" fullWidth onClick={() => navigate('/inventory')}>
          Cancelar
        </Button>
        <Button fullWidth disabled>
          <CheckCircle size={16} />
          Produto salvo
        </Button>
      </div>

      <ProductSearchModal
        open={upsellModal}
        onClose={() => setUpsellModal(false)}
        onSelect={addUpsell}
        excludeId={Number(id)}
      />
      <ProductSearchModal
        open={crossSellModal}
        onClose={() => setCrossSellModal(false)}
        onSelect={addCrossSell}
        excludeId={Number(id)}
      />
    </div>
  )
}
