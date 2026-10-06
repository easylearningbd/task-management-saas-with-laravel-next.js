'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resource } from '@/features/auth/types'
import type { Plan, PlanPayload } from '@/features/plans/types'

/* Super Admin plan endpoints (all through the shared axios client):
   GET|POST /api/v1/admin/plans · GET|PUT|DELETE /api/v1/admin/plans/{id} ·
   PATCH /api/v1/admin/plans/{id}/toggle-active */

export const planKeys = {
  all: ['plans'] as const,
  list: ['plans', 'list'] as const,
  detail: (id: number) => ['plans', 'detail', id] as const,
}

const endpoint = (id?: number) => (id === undefined ? '/api/v1/admin/plans' : `/api/v1/admin/plans/${id}`)

export function usePlans() {
  return useQuery({
    queryKey: planKeys.list,
    queryFn: async () => {
      const { data } = await api.get<Resource<Plan[]>>(endpoint())
      return data.data
    },
  })
}

/** One plan for the edit form. The edit page loads it on the server first (so a missing id is
 *  a real 404) and seeds it here as `initialData`. A 404 is not retried (global policy). */
export function usePlan(id: number, options: { initialData?: Plan } = {}) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Resource<Plan>>(endpoint(id))
      return data.data
    },
    enabled: Number.isInteger(id) && id > 0,
    initialData: options.initialData,
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: PlanPayload) => {
      const { data } = await api.post<Resource<Plan>>(endpoint(), payload)
      return data.data
    },
    onSuccess: async (plan) => {
      queryClient.setQueryData(planKeys.detail(plan.id), plan)
      // Making a plan default changes others too — refetch the whole list.
      await queryClient.invalidateQueries({ queryKey: planKeys.list })
    },
  })
}

export function useUpdatePlan(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: PlanPayload) => {
      const { data } = await api.put<Resource<Plan>>(endpoint(id), payload)
      return data.data
    },
    onSuccess: async (plan) => {
      queryClient.setQueryData(planKeys.detail(plan.id), plan)
      await queryClient.invalidateQueries({ queryKey: planKeys.list })
    },
  })
}

/** Soft-deletes. A blocked delete (default plan / has subscribers) rejects with the server's 422. */
export function useDeletePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoint(id))
      return id
    },
    onSuccess: async (id) => {
      queryClient.setQueryData<Plan[]>(planKeys.list, (plans) => plans?.filter((plan) => plan.id !== id))
      queryClient.removeQueries({ queryKey: planKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: planKeys.list })
    },
  })
}

/**
 * Flips `is_active` optimistically: the card's switch moves at once, the server's answer then
 * replaces the row, and a failure (e.g. 422 for the default plan) rolls the list back.
 */
export function useTogglePlanActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<Plan>>(`${endpoint(id)}/toggle-active`)
      return data.data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: planKeys.list })
      const previous = queryClient.getQueryData<Plan[]>(planKeys.list)
      queryClient.setQueryData<Plan[]>(planKeys.list, (plans) =>
        plans?.map((plan) => (plan.id === id ? { ...plan, is_active: !plan.is_active } : plan)),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(planKeys.list, context.previous)
    },
    onSuccess: (plan) => {
      queryClient.setQueryData<Plan[]>(planKeys.list, (plans) => plans?.map((item) => (item.id === plan.id ? plan : item)))
      queryClient.setQueryData(planKeys.detail(plan.id), plan)
    },
  })
}
