'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  COUPON_SORT_KEYS,
  COUPON_STATUS_FILTERS,
  COUPON_TYPES,
  type CouponFilterName,
  type CouponListParams,
  type CouponSortKey,
} from '@/features/coupons/types'

/* The Coupons list state in the URL (/admin/coupons?search=…&type=flat&status=active&
   expiry_from=…&expiry_to=…&sort=code&direction=desc&page=2&per_page=25), validated against
   the same values IndexCouponRequest accepts. */

const DATE = /^\d{4}-\d{2}-\d{2}$/

const CONFIG: ListParamsConfig<CouponFilterName, CouponSortKey> = {
  id: 'admin.coupons',
  filters: {
    type: (value) => (COUPON_TYPES as ReadonlyArray<string>).includes(value),
    status: (value) => (COUPON_STATUS_FILTERS as ReadonlyArray<string>).includes(value),
    expiry_from: (value) => DATE.test(value),
    expiry_to: (value) => DATE.test(value),
  },
  sortKeys: COUPON_SORT_KEYS,
}

export function useCouponListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<CouponListParams>(() => {
    const { type, status, expiry_from, expiry_to } = state.filters
    // A "to" before "from" would be a 422 — drop the "to" bound instead.
    const to = expiry_to && expiry_from && expiry_to < expiry_from ? '' : expiry_to
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(type ? { type: type as CouponListParams['type'] } : {}),
      ...(status ? { status: status as CouponListParams['status'] } : {}),
      ...(expiry_from ? { expiry_from } : {}),
      ...(to ? { expiry_to: to } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }
  }, [state])

  return { ...list, params }
}
