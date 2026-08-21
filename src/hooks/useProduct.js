import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProduct, createProduct, updateProduct } from '../api/products'
import { getVariations } from '../api/variations'
import toast from 'react-hot-toast'

export function useProduct(id) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useProductVariations(productId) {
  return useQuery({
    queryKey: ['variations', productId],
    queryFn: () => getVariations(productId),
    enabled: !!productId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => id ? updateProduct(id, data) : createProduct(data),
    onSuccess: (result) => {
      // Invalida o cache de listagem e dos detalhes do produto
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', result.id] })
      // Invalida também as variações (foto/preço/estoque da variação)
      queryClient.invalidateQueries({ queryKey: ['variations', result.id] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erro ao salvar produto')
    },
  })
}
