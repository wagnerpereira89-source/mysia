import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, deleteProduct, updateProduct } from '../api/products'
import toast from 'react-hot-toast'

export function useProducts(search = '', filters = {}) {
  return useInfiniteQuery({
    queryKey: ['products', search, filters],
    queryFn: ({ pageParam = 1 }) =>
      getProducts({ page: pageParam, search, ...filters }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.data.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produto excluído')
    },
    onError: () => toast.error('Erro ao excluir produto'),
  })
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => updateProduct(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] })
      const prev = queryClient.getQueriesData({ queryKey: ['products'] })
      queryClient.setQueriesData({ queryKey: ['products'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) => (p.id === id ? { ...p, status } : p)),
          })),
        }
      })
      return { prev }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueriesData({ queryKey: ['products'] }, ctx.prev)
      toast.error('Erro ao atualizar status')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}
