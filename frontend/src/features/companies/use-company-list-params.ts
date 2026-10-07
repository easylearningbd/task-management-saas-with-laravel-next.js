'use client'

import * as React from 'react'
import type { ViewMode } from '@/components/ui/view-toggle'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  COMPANY_SORT_KEYS,
  COMPANY_STATUSES,
  type CompanyFilterName,
  type CompanyListParams,
  type CompanySortKey,
} from '@/features/companies/types'

/* The Companies list state in the URL (/admin/companies?search=…&status=active&plan_id=3&
   created_from=…&created_to=…&sort=name&direction=desc&page=2&per_page=25&view=grid),
   validated against what IndexCompanyRequest accepts. `view` (list | grid) is UI-only: kept
   in the URL and the session, never sent to the API, untouched by Reset. */

const DATE = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_INT = /^[1-9]\d*$/

const CONFIG: ListParamsConfig<CompanyFilterName, CompanySortKey, 'view'> = {
  id: 'admin.companies',
  filters: {
    status: (value) => (COMPANY_STATUSES as ReadonlyArray<string>).includes(value),
    plan_id: (value) => POSITIVE_INT.test(value),
    created_from: (value) => DATE.test(value),
    created_to: (value) => DATE.test(value),
  },
  sortKeys: COMPANY_SORT_KEYS,
  ui: { view: { values: ['list', 'grid'], default: 'list' } },
}

export function useCompanyListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<CompanyListParams>(() => {
    const { status, plan_id, created_from, created_to } = state.filters
    // A "to" before "from" would be a 422 — drop the "to" bound instead.
    const to = created_to && created_from && created_to < created_from ? '' : created_to
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as CompanyListParams['status'] } : {}),
      ...(plan_id ? { plan_id: Number(plan_id) } : {}),
      ...(created_from ? { created_from } : {}),
      ...(to ? { created_to: to } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }
  }, [state])

  const view = state.ui.view as ViewMode
  const { setUi } = list
  const setView = React.useCallback((next: ViewMode) => setUi('view', next), [setUi])

  return { ...list, params, view, setView }
}
