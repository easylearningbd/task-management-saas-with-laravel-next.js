'use client'

import * as React from 'react'
import type { ViewMode } from '@/components/ui/view-toggle'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  CLIENT_SORT_KEYS,
  CLIENT_STATUSES,
  type ClientFilterName,
  type ClientListParams,
  type ClientSortKey,
} from '@/features/clients/types'

/* The Clients list state in the URL (/clients?search=…&status=active&created_from=…&
   created_to=…&sort=name&direction=desc&page=2&per_page=25&view=grid), validated against what
   IndexClientRequest accepts — an unknown value falls back to its default instead of a 422.
   The shared useListParams resets to page 1 on any search / filter / sort change and
   remembers rows-per-page and the view for the session; the shared FilterBar debounces the
   search box (300ms) before it reaches here. `view` (list | grid) is UI-only:
   kept in the URL, never sent to the API, untouched by Reset. */

const DATE = /^\d{4}-\d{2}-\d{2}$/

const CONFIG: ListParamsConfig<ClientFilterName, ClientSortKey, 'view'> = {
  id: 'company.clients',
  filters: {
    status: (value) => (CLIENT_STATUSES as ReadonlyArray<string>).includes(value),
    created_from: (value) => DATE.test(value),
    created_to: (value) => DATE.test(value),
  },
  sortKeys: CLIENT_SORT_KEYS,
  ui: { view: { values: ['list', 'grid'], default: 'list' } },
}

export function useClientListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<ClientListParams>(() => {
    const { status, created_from, created_to } = state.filters
    // A "to" before "from" would be a 422 — drop the "to" bound instead.
    const to = created_to && created_from && created_to < created_from ? '' : created_to
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as ClientListParams['status'] } : {}),
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
