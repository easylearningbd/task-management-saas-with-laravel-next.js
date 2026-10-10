'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resource } from '@/features/auth/types'
import type { PlanUsage } from '@/features/plan-usage/types'

/* The company's plan usage. Anything that changes it — creating or deleting a project,
   uploading or deleting media — invalidates `planUsageKeys.all`. */

export const planUsageKeys = {
  all: ['plan-usage'] as const,
}

export function usePlanUsage(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: planUsageKeys.all,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<PlanUsage>>('/api/v1/plan-usage', { signal })
      return data.data
    },
    enabled: options.enabled ?? true,
  })
}
