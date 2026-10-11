'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  PLAN_ORDER_SORT_KEYS,
  PLAN_ORDER_STATUSES,
  PLAN_ORDER_TYPES,
  type PlanOrderFilterName,
  type PlanOrderListParams,
  type PlanOrderSortKey,
  type PlanOrderStatus,
  type PlanOrderType,
} from '@/features/billing/types'

/* The Plan Requests list state in the URL (/plans/requests?search=…&status=pending&type=purchase&sort=plan&
   direction=desc&page=2&per_page=25), validated against what IndexPlanOrderRequest accepts — an
   unknown value falls back to its default instead of a 422. The shared useListParams resets to
   page 1 on any search / filter / sort change and remembers rows-per-page for the session. */

const CONFIG: ListParamsConfig<PlanOrderFilterName, PlanOrderSortKey> = {
  id: 'company.plan-orders',
  filters: {
    status: (value) => (PLAN_ORDER_STATUSES as ReadonlyArray<string>).includes(value),
    type: (value) => (PLAN_ORDER_TYPES as ReadonlyArray<string>).includes(value),
  },
  sortKeys: PLAN_ORDER_SORT_KEYS,
}

export function usePlanOrderListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<PlanOrderListParams>(
    () => ({
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(state.filters.status ? { status: state.filters.status as PlanOrderStatus } : {}),
      ...(state.filters.type ? { type: state.filters.type as PlanOrderType } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }),
    [state],
  )

  return { ...list, params }
}
