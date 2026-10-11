'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import { authKeys } from '@/features/auth/api'
import type { Resource } from '@/features/auth/types'
import { planUsageKeys } from '@/features/plan-usage/api'
import type { PlanActionPayload, PlanCatalog, PlanOrder, PlanOrderListParams, PurchasePayload } from '@/features/billing/types'

/* The company's billing (all through the shared axios client):
   GET /api/v1/plans — the catalog (plans, current plan + duration, trials, pending order, bank details)
   GET /api/v1/plan-orders · GET …/{id} · GET …/{id}/receipt (a URL, opened by the browser)
   POST /api/v1/plan-orders (multipart: the checkout) · POST …/request · POST …/trial · POST …/free
   The server scopes everything to the company and owns every rule (one pending order, current =
   plan + duration, one trial per plan, Stripe refused) — its 422s reach the caller untouched.

   After ANY of the four submissions: the catalog, every orders query, `/me` (the header dropdown's
   and the sidebar card's plan name — one source for both) and the plan usage (a trial or a $0 plan
   changes the limits at once) are refreshed. Invalidated even when refused, so a stale screen (an
   order approved meanwhile) never fights the server. */

export const billingKeys = {
  all: ['billing'] as const,
  catalog: ['billing', 'catalog'] as const,
  orders: ['billing', 'orders'] as const,
  list: (params: PlanOrderListParams) => ['billing', 'orders', 'list', params] as const,
  order: (id: number) => ['billing', 'orders', 'detail', id] as const,
}

const ORDERS = '/api/v1/plan-orders'
const isId = (id: number | null | undefined): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

/** How often the Plan Requests list re-asks while one of its rows is pending. */
export const PENDING_POLL_MS = 30_000
const hasPending = (page: Paginated<PlanOrder> | undefined) => page?.data.some((order) => order.status === 'pending') ?? false

/* ── Reads ── */

/** The Plans page and the checkout: the company's view of the plans. */
export function usePlans() {
  return useQuery({
    queryKey: billingKeys.catalog,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<PlanCatalog>>('/api/v1/plans', { signal })
      return data.data
    },
  })
}

/** One page of the Plan Requests list; the previous page stays on screen while the next loads. */
export function usePlanOrders(params: PlanOrderListParams) {
  return useQuery({
    queryKey: billingKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<PlanOrder>>(ORDERS, { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
    // While a row is pending, watch for the administrator's decision (useSyncMeWithOrders then
    // refreshes `/me`): every 30s while the tab is visible, and on coming back to the tab.
    refetchInterval: (query) => (hasPending(query.state.data) ? PENDING_POLL_MS : false),
    refetchOnWindowFocus: (query) => hasPending(query.state.data),
  })
}

/** One order (the details modal), seeded from its list row. Another company's id → 404. */
export function usePlanOrder(id: number | null, options: { initialData?: PlanOrder } = {}) {
  return useQuery({
    queryKey: billingKeys.order(id ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<PlanOrder>>(`${ORDERS}/${id ?? 0}`, { signal })
      return data.data
    },
    enabled: isId(id),
    initialData: options.initialData,
  })
}

/* ── Writes ── */

function useInvalidateBilling() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: billingKeys.all }),
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
      queryClient.invalidateQueries({ queryKey: planUsageKeys.all }),
    ])
  }
}

export type SubmitPurchaseInput = PurchasePayload & {
  /** 0–100 as the receipt goes up. */
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/** The checkout: a PENDING bank-transfer order with its receipt (201). The plan changes only when
 *  an administrator approves it. */
export function useSubmitPurchase() {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: async ({ onProgress, signal, ...payload }: SubmitPurchaseInput) => {
      const body = new FormData()
      body.append('plan_id', String(payload.plan_id))
      body.append('duration', payload.duration)
      body.append('payment_method', payload.payment_method)
      body.append('receipt', payload.receipt)
      if (payload.payment_reference !== null) body.append('payment_reference', payload.payment_reference)
      if (payload.notes !== null) body.append('notes', payload.notes)
      const { data } = await api.post<Resource<PlanOrder>>(ORDERS, body, {
        signal,
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.min(100, (event.loaded / event.total) * 100))
        },
      })
      return data.data
    },
    onSettled: async () => invalidate(),
  })
}

function usePlanAction(path: 'request' | 'trial' | 'free') {
  const invalidate = useInvalidateBilling()
  return useMutation({
    mutationFn: async (payload: PlanActionPayload) => {
      const { data } = await api.post<Resource<PlanOrder>>(`${ORDERS}/${path}`, payload)
      return data.data
    },
    onSettled: async () => invalidate(),
  })
}

/** Request Plan: a PENDING request, nothing to pay. */
export const useRequestPlan = () => usePlanAction('request')
/** Start N Day Trial: applied at once (the header and limits change now). */
export const useStartTrial = () => usePlanAction('trial')
/** Subscribe Now on a $0 plan: applied at once. */
export const useSubscribeFree = () => usePlanAction('free')
