'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import type { ExpenseCategory, ExpenseCategoryListParams, ExpenseCategoryPayload } from '@/features/expense-categories/types'

/* The signed-in company's expense categories (all through the shared axios client):
   GET|POST /api/v1/expense-categories · GET|PUT|DELETE …/{id} · PATCH …/{id}/toggle-status
   The server scopes everything to the company (BelongsToCompany) — nothing here sends a
   company id. List keys carry every query parameter; every write invalidates the lists and
   that category's detail. */

export const expenseCategoryKeys = {
  all: ['expense-categories'] as const,
  lists: ['expense-categories', 'list'] as const,
  list: (params: ExpenseCategoryListParams) => ['expense-categories', 'list', params] as const,
  details: ['expense-categories', 'detail'] as const,
  detail: (id: number) => ['expense-categories', 'detail', id] as const,
}

const endpoint = (id?: number) => (id === undefined ? '/api/v1/expense-categories' : `/api/v1/expense-categories/${id}`)

/** One page of the list. The previous page stays on screen while the next one loads. */
export function useExpenseCategories(params: ExpenseCategoryListParams) {
  return useQuery({
    queryKey: expenseCategoryKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<ExpenseCategory>>(endpoint(), { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** One category (the edit prefill), seeded from the list row when given, then refreshed.
 *  Another company's id answers 404. */
export function useExpenseCategory(id: number | null, options: { enabled?: boolean; initialData?: ExpenseCategory } = {}) {
  return useQuery({
    queryKey: expenseCategoryKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Resource<ExpenseCategory>>(endpoint(id ?? 0))
      return data.data
    },
    enabled: (options.enabled ?? true) && id !== null && Number.isInteger(id) && id > 0,
    initialData: options.initialData,
  })
}

/** After any write: every list page and (if given) that category's detail are stale. */
function useInvalidateExpenseCategories() {
  const queryClient = useQueryClient()
  return async (id?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.lists }),
      id === undefined ? Promise.resolve() : queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.detail(id) }),
    ])
  }
}

export function useCreateExpenseCategory() {
  const invalidate = useInvalidateExpenseCategories()

  return useMutation({
    mutationFn: async (payload: ExpenseCategoryPayload) => {
      const { data } = await api.post<Resource<ExpenseCategory>>(endpoint(), payload)
      return data.data
    },
    // A restored category (same name as a deleted one) comes back with its old id: drop any
    // stale detail for it too.
    onSuccess: async (category) => invalidate(category.id),
  })
}

export function useUpdateExpenseCategory(id: number) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateExpenseCategories()

  return useMutation({
    mutationFn: async (payload: ExpenseCategoryPayload) => {
      const { data } = await api.put<Resource<ExpenseCategory>>(endpoint(id), payload)
      return data.data
    },
    onSuccess: async (category) => {
      queryClient.setQueryData(expenseCategoryKeys.detail(id), category)
      await invalidate(id)
    },
  })
}

/** Soft-deletes; the detail cache is dropped (a deleted category is a 404). */
export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateExpenseCategories()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoint(id))
      return id
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: expenseCategoryKeys.detail(id) })
      await invalidate()
    },
  })
}

type Snapshot = Array<[QueryKey, unknown]>

const flipStatus = (category: ExpenseCategory): ExpenseCategory =>
  category.status === 'active'
    ? { ...category, status: 'inactive', status_label: 'Inactive' }
    : { ...category, status: 'active', status_label: 'Active' }

/**
 * The lock icon: flips the status optimistically in every cached list page and in the detail,
 * restores the snapshot if the request fails, and refetches either way. (The optimistic label
 * is replaced by the server's own `status_label` on the refetch.)
 */
export function useToggleExpenseCategoryStatus() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateExpenseCategories()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<ExpenseCategory>>(`${endpoint(id)}/toggle-status`)
      return data.data
    },
    onMutate: async (id): Promise<{ previous: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: expenseCategoryKeys.lists })
      await queryClient.cancelQueries({ queryKey: expenseCategoryKeys.detail(id) })
      const previous: Snapshot = [
        ...queryClient.getQueriesData({ queryKey: expenseCategoryKeys.lists }),
        [expenseCategoryKeys.detail(id), queryClient.getQueryData(expenseCategoryKeys.detail(id))],
      ]
      queryClient.setQueriesData<Paginated<ExpenseCategory>>({ queryKey: expenseCategoryKeys.lists }, (page) =>
        page ? { ...page, data: page.data.map((c) => (c.id === id ? flipStatus(c) : c)) } : page,
      )
      queryClient.setQueryData<ExpenseCategory>(expenseCategoryKeys.detail(id), (category) => (category ? flipStatus(category) : category))
      return { previous }
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async (_data, _error, id) => invalidate(id),
  })
}
