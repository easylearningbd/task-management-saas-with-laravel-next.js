'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLAN_ORDER_STATUSES, PLAN_ORDER_TYPES, type PlanOrderFilterName } from '@/features/billing/types'

/* The Plan Requests filter bar's controls: "All Status" (Pending / Approved / Rejected) inline next
   to the search, as drawn; the Filters panel (the screenshot shows the button, not its panel) holds
   the order Type — Plan Request / Purchase / Trial, the `type` the API already filters on. Radix
   forbids "" as a value, so "all" = none. */

const ALL = 'all'

type Filters = Record<PlanOrderFilterName, string>
type SetFilter = (name: PlanOrderFilterName, value: string) => void

export function PlanOrderStatusFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('billing.requests.filters')

  return (
    <Select value={filters.status || ALL} onValueChange={(value) => onChange('status', value === ALL ? '' : value)}>
      <SelectTrigger className="w-auto" aria-label={t('statusLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allStatus')}</SelectItem>
        {PLAN_ORDER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {t(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** The Filters panel: the order type, with a visible label. */
export function PlanOrderTypeFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('billing.requests.filters')
  const id = React.useId()

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-56">
      <Label htmlFor={id}>{t('typeLabel')}</Label>
      <Select value={filters.type || ALL} onValueChange={(value) => onChange('type', value === ALL ? '' : value)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allTypes')}</SelectItem>
          {PLAN_ORDER_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {t(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
