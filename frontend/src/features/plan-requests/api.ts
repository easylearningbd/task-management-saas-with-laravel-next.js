'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import { companyKeys } from '@/features/companies/api'
import { planKeys } from '@/features/plans/api'
import type { AdminPlanOrder, AdminPlanOrderListParams, RejectPlanOrderPayload } from '@/features/plan-requests/types'

/* The super admin's review of every company's plan orders (all through the shared axios client):
   GET /api/v1/admin/plan-orders · GET …/{id} · PATCH …/{id}/approve · PATCH …/{id}/reject ·
   GET …/{id}/receipt (a URL — `receipt_url` — opened by the browser).
   The server owns every rule (pending only, reviewed once under a row lock, an active plan, the
   reason required): its 422s reach the caller untouched.

   After an approve or reject: every plan-order query (the list, the open order); the Companies
   list and that company's details page (they show its plan, expiry and the activity log the
   approval writes); and the admin plans (a plan's subscriber count changes). The company's own
   screens are another session — they catch up on their own (billing's useSyncMeWith…). */

export const planRequestKeys = {
  all: ['admin-plan-orders'] as const,
  lists: ['admin-plan-orders', 'list'] as const,
  list: (params: AdminPlanOrderListParams) => ['admin-plan-orders', 'list', params] as const,
  detail: (id: number) => ['admin-plan-orders', 'detail', id] as const,
}

const ENDPOINT = '/api/v1/admin/plan-orders'
const isId = (id: number | null | undefined): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

/** One page of the list; the previous page stays on screen while the next one loads. */
export function useAdminPlanOrders(params: AdminPlanOrderListParams) {
  return useQuery({
    queryKey: planRequestKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<AdminPlanOrder>>(ENDPOINT, { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** One order (the review modal), seeded from its list row, then refreshed. Unknown id → 404. */
export function useAdminPlanOrder(id: number | null, options: { initialData?: AdminPlanOrder } = {}) {
  return useQuery({
    queryKey: planRequestKeys.detail(id ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<AdminPlanOrder>>(`${ENDPOINT}/${id ?? 0}`, { signal })
      return data.data
    },
    enabled: isId(id),
    initialData: options.initialData,
  })
}

/** A refused review (e.g. another admin got there first): show the order as it now is. */
function useRefreshAfterRefusal() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: planRequestKeys.all })
  }
}

function useAfterReview() {
  const queryClient = useQueryClient()
  return async (order: AdminPlanOrder) => {
    queryClient.setQueryData(planRequestKeys.detail(order.id), order)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: planRequestKeys.lists }),
      queryClient.invalidateQueries({ queryKey: companyKeys.lists }),
      ...(order.company ? [queryClient.invalidateQueries({ queryKey: companyKeys.detail(order.company.id) })] : []),
      queryClient.invalidateQueries({ queryKey: companyKeys.activities }),
      queryClient.invalidateQueries({ queryKey: planKeys.all }),
    ])
  }
}

/** Approve a pending order: the company moves to its plan + duration (and the plan's limits). */
export function useApprovePlanOrder() {
  const afterReview = useAfterReview()
  const refreshAfterRefusal = useRefreshAfterRefusal()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<AdminPlanOrder>>(`${ENDPOINT}/${id}/approve`)
      return data.data
    },
    onSuccess: afterReview,
    onError: refreshAfterRefusal,
  })
}

/** Reject a pending order with the reason the company will read; nothing on the company changes. */
export function useRejectPlanOrder() {
  const afterReview = useAfterReview()
  const refreshAfterRefusal = useRefreshAfterRefusal()
  return useMutation({
    mutationFn: async ({ id, ...payload }: RejectPlanOrderPayload & { id: number }) => {
      const { data } = await api.patch<Resource<AdminPlanOrder>>(`${ENDPOINT}/${id}/reject`, payload)
      return data.data
    },
    onSuccess: afterReview,
    onError: refreshAfterRefusal,
  })
}
