'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlans } from '@/features/plans/api'
import type { CompanyFilterName } from '@/features/companies/types'

/* The Companies filter bar's controls, per the screenshot: "All Status" (Active / Inactive) and
   the Created At range as two bare date inputs (leading Calendar, screen-reader labels) inline;
   the Filters panel holds the Plan filter. Radix forbids "" as a value, so "all" = no filter. */

const ALL = 'all'

type Filters = Record<CompanyFilterName, string>
type SetFilter = (name: CompanyFilterName, value: string) => void

export function CompanyInlineFilters({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('companies.list.filters')

  return (
    <>
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
      <DateRangeFilter
        from={filters.created_from}
        to={filters.created_to}
        onFromChange={(value) => onChange('created_from', value)}
        onToChange={(value) => onChange('created_to', value)}
        fromLabel={t('createdFrom')}
        toLabel={t('createdTo')}
        inputClassName="sm:w-58"
      />
    </>
  )
}

/** The Filters panel: the plan (every plan, active or not — a company may sit on an inactive one). */
export function CompanyPlanFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('companies.list.filters')
  const plans = usePlans()
  const id = React.useId()

  return (
    <Field className="w-full sm:w-56">
      <Label id={id}>{t('planLabel')}</Label>
      <Select value={filters.plan_id || ALL} onValueChange={(value) => onChange('plan_id', value === ALL ? '' : value)}>
        <SelectTrigger aria-labelledby={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allPlans')}</SelectItem>
          {(plans.data ?? []).map((plan) => (
            <SelectItem key={plan.id} value={String(plan.id)}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
