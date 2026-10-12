'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useProjects } from '@/features/projects/api'
import { INVOICE_STATUSES, type InvoiceFilterName } from '@/features/invoices/types'

/* The Invoices filter bar's controls, per the screenshot: All Status · All Clients · All Projects
   and the invoice-date range (two `mm/dd/yyyy` inputs, labels for screen readers) inline after the
   search; the Filters panel (the screenshot shows the button, not its panel — Invoices Phase 4
   decision) holds "Overdue only". Clients and projects are the company's own, A–Z; once a client is
   chosen, only its projects are offered (and choosing another client drops a project that isn't
   theirs). Radix forbids "" as a value, so "all" = none. */

const ALL = 'all'
const OPTIONS = { page: 1, per_page: 100, sort: 'name', direction: 'asc' } as const

type Filters = Record<InvoiceFilterName, string>
type SetFilter = (name: InvoiceFilterName, value: string) => void
type SetFilters = (values: Partial<Filters>) => void

export function InvoiceInlineFilters({ filters, onChange, onChangeMany }: { filters: Filters; onChange: SetFilter; onChangeMany: SetFilters }) {
  const t = useTranslations('invoices.list.filters')
  const clients = useClients(OPTIONS)
  const projects = useProjects({ ...OPTIONS, ...(filters.client_id ? { client_id: Number(filters.client_id) } : {}) })

  return (
    <>
      <Select value={filters.status || ALL} onValueChange={(value) => onChange('status', value === ALL ? '' : value)}>
        <SelectTrigger className="w-auto" aria-label={t('statusLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allStatus')}</SelectItem>
          {INVOICE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.client_id || ALL}
        // One write: the client, and no project (a project belongs to one client).
        onValueChange={(value) => onChangeMany({ client_id: value === ALL ? '' : value, project_id: '' })}
      >
        <SelectTrigger className="w-auto max-w-56" aria-label={t('clientLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allClients')}</SelectItem>
          {(clients.data?.data ?? []).map((client) => (
            <SelectItem key={client.id} value={String(client.id)}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.project_id || ALL} onValueChange={(value) => onChange('project_id', value === ALL ? '' : value)}>
        <SelectTrigger className="w-auto max-w-56" aria-label={t('projectLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allProjects')}</SelectItem>
          {(projects.data?.data ?? []).map((project) => (
            <SelectItem key={project.id} value={String(project.id)}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DateRangeFilter
        from={filters.date_from}
        to={filters.date_to}
        onFromChange={(value) => onChange('date_from', value)}
        onToChange={(value) => onChange('date_to', value)}
        fromLabel={t('dateFrom')}
        toLabel={t('dateTo')}
        inputClassName="sm:w-58"
      />
    </>
  )
}

/** The Filters panel: "Overdue only" — past due with money still owed. */
export function InvoiceOverdueFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('invoices.list.filters')
  const id = React.useId()

  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={filters.overdue === '1'} onCheckedChange={(on) => onChange('overdue', on === true ? '1' : '')} />
      <Label htmlFor={id}>{t('overdueOnly')}</Label>
    </div>
  )
}
