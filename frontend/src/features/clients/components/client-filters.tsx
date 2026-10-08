'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ClientFilterName } from '@/features/clients/types'

/* The Clients filter bar's controls, per the screenshot: "All Status" (Active / Inactive) inline
   next to the search; the Filters panel holds the Created At range (Phase 0 decision 3 — the
   screenshot shows the button, not its panel). Radix forbids "" as a value, so "all" = none. */

const ALL = 'all'

type Filters = Record<ClientFilterName, string>
type SetFilter = (name: ClientFilterName, value: string) => void

export function ClientStatusFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('clients.list.filters')

  return (
    <Select value={filters.status || ALL} onValueChange={(value) => onChange('status', value === ALL ? '' : value)}>
      <SelectTrigger className="w-auto" aria-label={t('statusLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allStatus')}</SelectItem>
        <SelectItem value="active">{t('active')}</SelectItem>
        <SelectItem value="inactive">{t('inactive')}</SelectItem>
      </SelectContent>
    </Select>
  )
}

/** The Filters panel: the Created At range, with visible labels. */
export function ClientCreatedFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('clients.list.filters')

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
