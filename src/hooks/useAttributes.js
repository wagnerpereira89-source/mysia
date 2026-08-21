import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttributes, createAttribute, getAttributeTerms, createAttributeTerm } from '../api/attributes'
import toast from 'react-hot-toast'

export function useAttributes() {
  return useQuery({
    queryKey: ['attributes'],
    queryFn: getAttributes,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useAttributeTerms(attributeId) {
  return useQuery({
    queryKey: ['attribute-terms', attributeId],
    queryFn: () => getAttributeTerms(attributeId),
    enabled: !!attributeId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateAttribute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name) => createAttribute({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] })
    },
    onError: () => toast.error('Erro ao criar atributo'),
  })
}

export function useCreateAttributeTerm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attributeId, name }) => createAttributeTerm(attributeId, { name }),
    onSuccess: (_, { attributeId }) => {
      queryClient.invalidateQueries({ queryKey: ['attribute-terms', attributeId] })
    },
    onError: () => toast.error('Erro ao criar valor'),
  })
}
