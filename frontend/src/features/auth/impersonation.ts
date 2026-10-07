'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resource, User } from '@/features/auth/types'

/* "Login as company" and "Back to Admin" (approved design, Companies Phase 3).

   Both switch the session's user on the server, so on success every cached query belongs to
   the wrong identity: the cache is cleared and the page is left with a FULL navigation (not a
   client-side route change) — `proxy.ts` and the server layout guards then run again against
   the new session. Neither needed changing: they learn the role from /api/v1/me. */

export const IMPERSONATION_HOME = '/dashboard'
export const AFTER_IMPERSONATION = '/admin/companies'

/** POST /api/v1/admin/companies/{id}/impersonate → lands on the company dashboard. */
export function useImpersonate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId: number) => {
      const { data } = await api.post<Resource<User>>(`/api/v1/admin/companies/${companyId}/impersonate`)
      return data.data
    },
    onSuccess: () => {
      queryClient.clear()
      window.location.replace(IMPERSONATION_HOME)
    },
  })
}

/** POST /api/v1/stop-impersonating → back to the Companies list as the super admin. */
export function useStopImpersonating() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Resource<User>>('/api/v1/stop-impersonating')
      return data.data
    },
    onSuccess: () => {
      queryClient.clear()
      window.location.replace(AFTER_IMPERSONATION)
    },
  })
}
