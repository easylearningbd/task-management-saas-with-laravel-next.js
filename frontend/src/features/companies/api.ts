'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import type {
  ActivityListParams,
  ChangeCompanyPlanPayload,
  Company,
  CompanyActivity,
  CompanyDetail,
  CompanyListParams,
  CreateCompanyPayload,
  ResetCompanyPasswordPayload,
  UpdateCompanyPayload,
} from '@/features/companies/types'

export { useImpersonate, useStopImpersonating } from '@/features/auth/impersonation'

/* Super Admin company endpoints (all through the shared axios client):
   GET|POST /api/v1/admin/companies · GET|PUT|DELETE /api/v1/admin/companies/{id} ·
   PATCH …/{id}/toggle-login · PATCH …/{id}/reset-password · PATCH …/{id}/change-plan ·
   GET …/{id}/activities · GET /api/v1/admin/activities · POST …/{id}/impersonate
   List keys carry every query parameter. Every write invalidates the lists, the company's
   detail and the activity logs (each action writes a log row). */

export const companyKeys = {
  all: ['companies'] as const,
  lists: ['companies', 'list'] as const,
  list: (params: CompanyListParams) => ['companies', 'list', params] as const,
  details: ['companies', 'detail'] as const,
  detail: (id: number) => ['companies', 'detail', id] as const,
  activities: ['companies', 'activities'] as const,
  companyActivities: (id: number, params: ActivityListParams) => ['companies', 'activities', id, params] as const,
  allActivities: (params: ActivityListParams) => ['companies', 'activities', 'all', params] as const,
}

const endpoint = (id?: number) => (id === undefined ? '/api/v1/admin/companies' : `/api/v1/admin/companies/${id}`)

/** One page of the list. The previous page stays on screen while the next one loads. */
export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<Company>>(endpoint(), { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** The details page payload (plan, limits, usage, has_password, recent activity). */
export function useCompany(id: number | null, options: { initialData?: CompanyDetail } = {}) {
  return useQuery({
    queryKey: companyKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Resource<CompanyDetail>>(endpoint(id ?? 0))
      return data.data
    },
    enabled: id !== null && Number.isInteger(id) && id > 0,
    // The details page passes the copy its server component loaded (fresh for `staleTime`).
    initialData: options.initialData,
  })
}

/** One company's log, newest first. */
export function useCompanyActivities(id: number | null, params: ActivityListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: companyKeys.companyActivities(id ?? 0, params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<CompanyActivity>>(`${endpoint(id ?? 0)}/activities`, { params, signal })
      return data
    },
    enabled: (options.enabled ?? true) && id !== null && id > 0,
    placeholderData: keepPreviousData,
  })
}

/** Every company's log, newest first (the header history button). */
export function useAllActivities(params: ActivityListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: companyKeys.allActivities(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<CompanyActivity>>('/api/v1/admin/activities', { params, signal })
      return data
    },
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

/** After any write: lists, the company's detail and every activity log are stale. */
function useInvalidateCompany() {
  const queryClient = useQueryClient()
  return async (id?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: companyKeys.lists }),
      queryClient.invalidateQueries({ queryKey: companyKeys.activities }),
      id === undefined ? Promise.resolve() : queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) }),
    ])
  }
}

export function useCreateCompany() {
  const invalidate = useInvalidateCompany()

  return useMutation({
    mutationFn: async (payload: CreateCompanyPayload) => {
      const { data } = await api.post<Resource<Company>>(endpoint(), payload)
      return data.data
    },
    onSuccess: async (company) => invalidate(company.id),
  })
}

export function useUpdateCompany(id: number) {
  const invalidate = useInvalidateCompany()

  return useMutation({
    mutationFn: async (payload: UpdateCompanyPayload) => {
      const { data } = await api.put<Resource<Company>>(endpoint(id), payload)
      return data.data
    },
    onSuccess: async () => invalidate(id),
  })
}

/** Soft-deletes; the detail cache is dropped (a deleted company is a 404). */
export function useDeleteCompany() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCompany()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoint(id))
      return id
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: companyKeys.detail(id) })
      await invalidate()
    },
  })
}

type Snapshot = Array<[QueryKey, unknown]>

/**
 * Flips `is_login_enabled` optimistically in every cached list page and in the detail; a
 * failure (e.g. 422 "no password yet") restores them. `status` is never touched.
 */
export function useToggleCompanyLogin() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCompany()

  const flip = (id: number) => {
    queryClient.setQueriesData<Paginated<Company>>({ queryKey: companyKeys.lists }, (page) =>
      page ? { ...page, data: page.data.map((c) => (c.id === id ? { ...c, is_login_enabled: !c.is_login_enabled } : c)) } : page,
    )
    queryClient.setQueryData<CompanyDetail>(companyKeys.detail(id), (detail) =>
      detail ? { ...detail, is_login_enabled: !detail.is_login_enabled } : detail,
    )
  }

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<Company>>(`${endpoint(id)}/toggle-login`)
      return data.data
    },
    onMutate: async (id): Promise<{ previous: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: companyKeys.lists })
      await queryClient.cancelQueries({ queryKey: companyKeys.detail(id) })
      const previous: Snapshot = [
        ...queryClient.getQueriesData({ queryKey: companyKeys.lists }),
        [companyKeys.detail(id), queryClient.getQueryData(companyKeys.detail(id))],
      ]
      flip(id)
      return { previous }
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async (_data, _error, id) => invalidate(id),
  })
}

export function useResetCompanyPassword(id: number) {
  const invalidate = useInvalidateCompany()

  return useMutation({
    mutationFn: async (payload: ResetCompanyPasswordPayload) => {
      const { data } = await api.patch<Resource<Company>>(`${endpoint(id)}/reset-password`, payload)
      return data.data
    },
    onSuccess: async () => invalidate(id),
  })
}

/** Manual plan assignment (no payment): the row's plan badge and the detail refresh. */
export function useChangeCompanyPlan(id: number) {
  const invalidate = useInvalidateCompany()

  return useMutation({
    mutationFn: async (payload: ChangeCompanyPlanPayload) => {
      const { data } = await api.patch<Resource<Company>>(`${endpoint(id)}/change-plan`, payload)
      return data.data
    },
    onSuccess: async () => invalidate(id),
  })
}
