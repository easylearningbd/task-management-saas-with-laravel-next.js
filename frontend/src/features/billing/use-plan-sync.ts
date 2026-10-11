'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authKeys } from '@/features/auth/api'
import type { User } from '@/features/auth/types'
import { billingKeys } from '@/features/billing/api'
import type { PlanCatalog, PlanOrder } from '@/features/billing/types'
import { planUsageKeys } from '@/features/plan-usage/api'

/* An administrator's approval happens in another session, so nothing on this side invalidates
   `/me` for it — and queries never refetch on focus here. These keep the header dropdown and the
   sidebar card (both read `/me`) in step with what the billing endpoints report:
   - useSyncMeWithOrders: a Plan Requests row reviewed AFTER `/me` was last fetched (the list
     polls while an order is pending) → refresh `/me`, the plan usage and the catalog. Each review
     triggers once (a clock skew between server and browser can't make it loop).
   - useSyncMeWithCatalog: the catalog's current plan + duration differs from `/me`'s → refresh
     `/me` and the plan usage (once per catalog response). */

export function useSyncMeWithOrders(orders: ReadonlyArray<PlanOrder> | undefined) {
  const queryClient = useQueryClient()
  const handled = React.useRef(new Set<string>())

  React.useEffect(() => {
    if (!orders) return
    const meFetchedAt = queryClient.getQueryState(authKeys.me)?.dataUpdatedAt ?? 0
    const reviewed = orders.filter((order) => {
      if (!order.reviewed_at) return false
      const key = `${order.id}:${order.reviewed_at}`
      if (handled.current.has(key) || Date.parse(order.reviewed_at) <= meFetchedAt) return false
      handled.current.add(key)
      return true
    })
    if (reviewed.length === 0) return
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
      queryClient.invalidateQueries({ queryKey: planUsageKeys.all }),
      queryClient.invalidateQueries({ queryKey: billingKeys.catalog }),
    ])
  }, [orders, queryClient])
}

export function useSyncMeWithCatalog(current: PlanCatalog['current'] | undefined) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const me = queryClient.getQueryData<User | null>(authKeys.me)
    if (!current || !me || me.role !== 'company') return
    if (me.plan?.id === current.plan_id && me.plan?.duration === current.duration) return
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
      queryClient.invalidateQueries({ queryKey: planUsageKeys.all }),
    ])
  }, [current, queryClient])
}
