'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  INVOICE_SORT_KEYS,
  INVOICE_STATUSES,
  type InvoiceFilterName,
  type InvoiceListParams,
  type InvoiceSortKey,
  type InvoiceStatus,
} from '@/features/invoices/types'

/* The Invoices list state in the URL (/invoices?search=…&status=partial&client_id=3&project_id=7&
   date_from=2026-10-01&date_to=2026-10-31&overdue=1&sort=due_date&direction=asc&page=2&per_page=25),
   validated against what IndexInvoiceRequest accepts — an unknown value falls back to its default
   instead of a 422. The shared useListParams resets to page 1 on any search / filter / sort change
   and remembers rows-per-page for the session. */

const DATE = /^\d{4}-\d{2}-\d{2}$/
const ID = /^[1-9]\d*$/

const CONFIG: ListParamsConfig<InvoiceFilterName, InvoiceSortKey> = {
  id: 'company.invoices',
  filters: {
    status: (value) => (INVOICE_STATUSES as ReadonlyArray<string>).includes(value),
    client_id: (value) => ID.test(value),
    project_id: (value) => ID.test(value),
    date_from: (value) => DATE.test(value),
    date_to: (value) => DATE.test(value),
    overdue: (value) => value === '1',
  },
  sortKeys: INVOICE_SORT_KEYS,
}

export function useInvoiceListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<InvoiceListParams>(() => {
    const { status, client_id, project_id, date_from, date_to, overdue } = state.filters
    // An inverted range would be a 422 — send the "to" only when it isn't before the "from".
    const to = date_to && (!date_from || date_to >= date_from) ? date_to : ''
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as InvoiceStatus } : {}),
      ...(client_id ? { client_id: Number(client_id) } : {}),
      ...(project_id ? { project_id: Number(project_id) } : {}),
      ...(date_from ? { date_from } : {}),
      ...(to ? { date_to: to } : {}),
      ...(overdue === '1' ? { overdue: 1 as const } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }
  }, [state])

  return { ...list, params }
}
