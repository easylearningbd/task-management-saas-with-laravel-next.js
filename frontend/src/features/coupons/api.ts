'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import type { Coupon, CouponListParams, CouponPayload } from '@/features/coupons/types'

/* Super Admin coupon endpoints (all through the shared axios client):
   GET|POST /api/v1/admin/coupons · GET|PUT|DELETE /api/v1/admin/coupons/{id} ·
   PATCH /api/v1/admin/coupons/{id}/toggle-status · GET /api/v1/admin/coupons/generate-code
   The list key carries every query parameter, so each page / filter / sort combination is its
   own cache entry; every write invalidates all of them. */

export const couponKeys = {
  all: ['coupons'] as const,
  lists: ['coupons', 'list'] as const,
  list: (params: CouponListParams) => ['coupons', 'list', params] as const,
  detail: (id: number) => ['coupons', 'detail', id] as const,
}

const endpoint = (id?: number) => (id === undefined ? '/api/v1/admin/coupons' : `/api/v1/admin/coupons/${id}`)

/** One page of the list. The previous page stays on screen while the next one loads. */
export function useCoupons(params: CouponListParams) {
  return useQuery({
    queryKey: couponKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<Coupon>>(endpoint(), { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** One coupon (details modal / edit prefill), seeded from the list row when available. */
export function useCoupon(id: number | null, options: { initialData?: Coupon } = {}) {
  return useQuery({
    queryKey: couponKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Resource<Coupon>>(endpoint(id ?? 0))
      return data.data
    },
    enabled: id !== null && Number.isInteger(id) && id > 0,
    initialData: options.initialData,
  })
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CouponPayload) => {
      const { data } = await api.post<Resource<Coupon>>(endpoint(), payload)
      return data.data
    },
    onSuccess: async (coupon) => {
      queryClient.setQueryData(couponKeys.detail(coupon.id), coupon)
      await queryClient.invalidateQueries({ queryKey: couponKeys.lists })
    },
  })
}

export function useUpdateCoupon(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CouponPayload) => {
      const { data } = await api.put<Resource<Coupon>>(endpoint(id), payload)
      return data.data
    },
    onSuccess: async (coupon) => {
      queryClient.setQueryData(couponKeys.detail(coupon.id), coupon)
      await queryClient.invalidateQueries({ queryKey: couponKeys.lists })
    },
  })
}

/** Soft-deletes; every cached list is refetched (rows shift up from the next page). */
export function useDeleteCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoint(id))
      return id
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: couponKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: couponKeys.lists })
    },
  })
}

type ListSnapshot = Array<[QueryKey, Paginated<Coupon> | undefined]>

/**
 * Flips `is_active` optimistically in every cached list page; a failure restores them. On
 * success the server's row replaces the optimistic one and the lists are refetched (so a
 * status-filtered view drops the row).
 */
export function useToggleCouponStatus() {
  const queryClient = useQueryClient()

  const patchRow = (id: number, patch: (coupon: Coupon) => Coupon) =>
    queryClient.setQueriesData<Paginated<Coupon>>({ queryKey: couponKeys.lists }, (page) =>
      page ? { ...page, data: page.data.map((coupon) => (coupon.id === id ? patch(coupon) : coupon)) } : page,
    )

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<Coupon>>(`${endpoint(id)}/toggle-status`)
      return data.data
    },
    onMutate: async (id): Promise<{ previous: ListSnapshot }> => {
      await queryClient.cancelQueries({ queryKey: couponKeys.lists })
      const previous = queryClient.getQueriesData<Paginated<Coupon>>({ queryKey: couponKeys.lists })
      patchRow(id, (coupon) => ({ ...coupon, is_active: !coupon.is_active }))
      return { previous }
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: async (coupon) => {
      patchRow(coupon.id, () => coupon)
      queryClient.setQueryData(couponKeys.detail(coupon.id), coupon)
      await queryClient.invalidateQueries({ queryKey: couponKeys.lists })
    },
  })
}

/** A fresh unique code for the Auto Generate radio (never cached — every call is new). */
export function useGenerateCouponCode() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<Resource<{ code: string }>>(`${endpoint()}/generate-code`)
      return data.data.code
    },
  })
}
