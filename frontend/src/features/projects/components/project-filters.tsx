'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { PROJECT_PRIORITIES, type ProjectFilterName } from '@/features/projects/types'

/* The Projects filter bar's controls, per the screenshot: "All Priority" and "All Clients" inline
   after the search; the Filters panel holds the Created At range, as on Clients and Task Stages
   (the screenshot shows the button, not its panel — Phase 7 choice, reported). Radix forbids ""
   as a value, so "all" = none.
   All Clients lists every client of the company (inactive ones too — their projects are still
   listed), A–Z, up to the API's page maximum of 100. */

const ALL = 'all'

type Filters = Record<ProjectFilterName, string>
type SetFilter = (name: ProjectFilterName, value: string) => void

export function ProjectPriorityFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('projects.list.filters')
  const tPriority = useTranslations('projects.priority')

  return (
    <Select value={filters.priority || ALL} onValueChange={(value) => onChange('priority', value === ALL ? '' : value)}>
      <SelectTrigger className="w-auto" aria-label={t('priorityLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allPriority')}</SelectItem>
        {PROJECT_PRIORITIES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            {tPriority(priority)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProjectClientFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('projects.list.filters')
  const clients = useClients({ page: 1, per_page: 100, sort: 'name', direction: 'asc' })
  const options = clients.data?.data ?? []
  // A client id from the URL that isn't loaded (yet) still needs an item, or Radix shows nothing.
  const selected = filters.client_id
  const known = selected === '' || options.some((client) => String(client.id) === selected)

  return (
    <Select value={selected || ALL} onValueChange={(value) => onChange('client_id', value === ALL ? '' : value)}>
      <SelectTrigger className="w-auto max-w-56" aria-label={t('clientLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allClients')}</SelectItem>
        {options.map((client) => (
          <SelectItem key={client.id} value={String(client.id)}>
            {client.name}
          </SelectItem>
        ))}
        {!known ? <SelectItem value={selected}>{t('unknownClient')}</SelectItem> : null}
      </SelectContent>
    </Select>
  )
}

/** The Filters panel: the Created At range, with visible labels. */
export function ProjectCreatedFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('projects.list.filters')

  return (
    <DateRangeFilter
      from={filters.created_from}
      to={filters.created_to}
      onFromChange={(value) => onChange('created_from', value)}
      onToChange={(value) => onChange('created_to', value)}
      fromLabel={t('createdFrom')}
      toLabel={t('createdTo')}
      showLabels
      inputClassName="sm:w-56"
    />
  )
}
