'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import { PLAN_ORDER_STATUSES, PLAN_ORDER_TYPES, type PlanOrderStatus, type PlanOrderType } from '@/features/billing/types'
import {
  ADMIN_PLAN_ORDER_SORT_KEYS,
  type AdminPlanOrderFilterName,
  type AdminPlanOrderListParams,
  type AdminPlanOrderSortKey,
} from '@/features/plan-requests/types'

/* The admin Plan Requests list state in the URL (/admin/plans/requests?search=…&status=pending&
   type=purchase&plan_id=3&sort=status&direction=asc&page=2&per_page=25), validated against what
   Admin\IndexPlanOrderRequest accepts — an unknown value falls back to its default instead of a
   422. The shared useListParams resets to page 1 on any search / filter / sort change and
   remembers rows-per-page for the session. */

const CONFIG: ListParamsConfig<AdminPlanOrderFilterName, AdminPlanOrderSortKey> = {
  id: 'admin.plan-orders',
  filters: {
    status: (value) => (PLAN_ORDER_STATUSES as ReadonlyArray<string>).includes(value),
    type: (value) => (PLAN_ORDER_TYPES as ReadonlyArray<string>).includes(value),
    plan_id: (value) => /^[1-9]\d*$/.test(value),
  },
  sortKeys: ADMIN_PLAN_ORDER_SORT_KEYS,
}

export function usePlanRequestListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<AdminPlanOrderListParams>(() => {
    const { status, type, plan_id } = state.filters
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as PlanOrderStatus } : {}),
      ...(type ? { type: type as PlanOrderType } : {}),
      ...(plan_id ? { plan_id: Number(plan_id) } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }
  }, [state])

  return { ...list, params }
}
