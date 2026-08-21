import { useState, useEffect, useRef } from 'react'
import { Search, SlidersHorizontal, Plus, LogOut, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProducts, useDeleteProduct } from '../hooks/useProducts'
import { ProductCard } from '../components/ProductCard'
import { ProductSkeleton } from '../components/ui/Skeleton'
import { Sheet } from '../components/ui/Sheet'
import { useAuth } from '../hooks/useAuth'
import { getVariations } from '../api/variations'
import { useMutation } from '@tanstack/react-query'
import { deleteVariation } from '../api/variations'
import toast from 'react-hot-toast'
import { config } from '../config'

const LOGO_URL = config.logos.full

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function useProductsVariations(products, queryClient) {
  useEffect(() => {
    products.forEach((product) => {
      if (product.type === 'variable') {
        const cached = queryClient.getQueryData(['variations', product.id])
        if (!cached || (Array.isArray(cached) && cached.length === 0)) {
          queryClient.fetchQuery({
            queryKey: ['variations', product.id],
            queryFn: () => getVariations(product.id),
            staleTime: 60 * 1000,
          })
        }
      }
    })
  }, [products, queryClient])
}

export default function Inventory() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const queryClient = useQueryClient()

  const [, setTick] = useState(0)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts(debouncedSearch)

  const allProducts = data?.pages.flatMap((p) => p.data) ?? []
  const total = data?.pages[0]?.total ?? 0

  useProductsVariations(allProducts, queryClient)

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setTick((t) => t + 1)
    })
    return () => unsubscribe()
  }, [queryClient])

  const bottomRef = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage) fetchNextPage() },
      { threshold: 0.5 }
    )
    if (bottomRef.current) observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

  const deleteProduct = useDeleteProduct()

  const deleteVariationMut = useMutation({
    mutationFn: ({ productId, variationId }) => deleteVariation(productId, variationId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['variations', productId] })
      toast.success('Variação excluída')
    },
    onError: () => toast.error('Erro ao excluir variação'),
  })

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header igual ao Dashboard */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e4e4e7] px-4 h-20 flex items-center gap-3">
        <img
          src={LOGO_URL}
          alt={config.clientName}
          className="h-14 w-auto object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div className="w-px h-8 bg-[#e4e4e7]" />
        <h1 className="text-base font-bold text-[#1a1a1a]">Inventário</h1>
        <div className="flex-1" />
        <button
          onClick={logout}
          className="p-2 rounded-lg text-[#52525b] hover:bg-[#f4f4f5]"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </header>

      <div className="max-w-mobile mx-auto px-4 pb-28">
        {/* Search + filter */}
        <div className="flex gap-2 py-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU ou tag..."
              className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary placeholder:text-[#a1a1aa]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="h-10 w-10 flex-shrink-0 bg-white border border-[#e4e4e7] rounded-xl flex items-center justify-center text-[#52525b] hover:bg-[#f4f4f5]"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {!isLoading && (
          <p className="text-sm text-[#52525b] mb-3">
            {total} {total === 1 ? 'produto' : 'produtos'}
          </p>
        )}

        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />)
            : allProducts.map((product) => {
                const variations =
                  queryClient.getQueryData(['variations', product.id]) ?? []
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variations={variations}
                    onEditVariation={(v) =>
                      navigate(`/products/${product.id}/edit?variation=${v.id}`)
                    }
                    onDeleteVariation={(v) =>
                      deleteVariationMut.mutate({ productId: product.id, variationId: v.id })
                    }
                  />
                )
              })}
        </div>

        <div ref={bottomRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* FAB — posicionado acima da navbar */}
      <button
        onClick={() => navigate('/products/new')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#2a3929] active:scale-95 transition-transform z-30"
      >
        <Plus size={24} />
      </button>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtros">
        <p className="text-sm text-[#a1a1aa]">Filtros adicionais em breve.</p>
      </Sheet>
    </div>
  )
}
