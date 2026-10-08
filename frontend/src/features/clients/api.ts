'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import type { Client, ClientListParams, ClientPayload } from '@/features/clients/types'

/* The signed-in company's clients (all through the shared axios client):
   GET|POST /api/v1/clients · GET|PUT|DELETE /api/v1/clients/{id} · PATCH …/{id}/toggle-status
   The server scopes everything to the company (BelongsToCompany) — nothing here sends a
   company id. List keys carry every query parameter; every write invalidates the lists and
   that client's detail. */

export const clientKeys = {
  all: ['clients'] as const,
  lists: ['clients', 'list'] as const,
  list: (params: ClientListParams) => ['clients', 'list', params] as const,
  details: ['clients', 'detail'] as const,
  detail: (id: number) => ['clients', 'detail', id] as const,
}

const endpoint = (id?: number) => (id === undefined ? '/api/v1/clients' : `/api/v1/clients/${id}`)

/** One page of the list. The previous page stays on screen while the next one loads. */
export function useClients(params: ClientListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<Client>>(endpoint(), { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** One client (the details modal), seeded from the list row when given, then refreshed.
 *  Another company's id answers 404. */
export function useClient(id: number | null, options: { enabled?: boolean; initialData?: Client } = {}) {
  return useQuery({
    queryKey: clientKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Resource<Client>>(endpoint(id ?? 0))
      return data.data
    },
    enabled: (options.enabled ?? true) && id !== null && Number.isInteger(id) && id > 0,
    initialData: options.initialData,
  })
}

/** After any write: every list page and (if given) that client's detail are stale. */
function useInvalidateClients() {
  const queryClient = useQueryClient()
  return async (id?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.lists }),
      id === undefined ? Promise.resolve() : queryClient.invalidateQueries({ queryKey: clientKeys.detail(id) }),
    ])
  }
}

export function useCreateClient() {
  const invalidate = useInvalidateClients()

  return useMutation({
    mutationFn: async (payload: ClientPayload) => {
      const { data } = await api.post<Resource<Client>>(endpoint(), payload)
      return data.data
    },
    onSuccess: async () => invalidate(),
  })
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateClients()

  return useMutation({
    mutationFn: async (payload: ClientPayload) => {
      const { data } = await api.put<Resource<Client>>(endpoint(id), payload)
      return data.data
    },
    onSuccess: async (client) => {
      queryClient.setQueryData(clientKeys.detail(id), client)
      await invalidate(id)
    },
  })
}

/** Soft-deletes; the detail cache is dropped (a deleted client is a 404). */
export function useDeleteClient() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateClients()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoint(id))
      return id
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: clientKeys.detail(id) })
      await invalidate()
    },
  })
}

type Snapshot = Array<[QueryKey, unknown]>

const flipStatus = (client: Client): Client =>
  client.status === 'active'
    ? { ...client, status: 'inactive', status_label: 'Inactive' }
    : { ...client, status: 'active', status_label: 'Active' }

/**
 * The lock icon: flips the status optimistically in every cached list page and in the detail,
 * restores the snapshot if the request fails, and refetches either way. (The optimistic label
 * is replaced by the server's own `status_label` on the refetch.)
 */
export function useToggleClientStatus() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateClients()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<Client>>(`${endpoint(id)}/toggle-status`)
      return data.data
    },
    onMutate: async (id): Promise<{ previous: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: clientKeys.lists })
      await queryClient.cancelQueries({ queryKey: clientKeys.detail(id) })
      const previous: Snapshot = [
        ...queryClient.getQueriesData({ queryKey: clientKeys.lists }),
        [clientKeys.detail(id), queryClient.getQueryData(clientKeys.detail(id))],
      ]
      queryClient.setQueriesData<Paginated<Client>>({ queryKey: clientKeys.lists }, (page) =>
        page ? { ...page, data: page.data.map((c) => (c.id === id ? flipStatus(c) : c)) } : page,
      )
      queryClient.setQueryData<Client>(clientKeys.detail(id), (client) => (client ? flipStatus(client) : client))
      return { previous }
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async (_data, _error, id) => invalidate(id),
  })
}
