'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlanOrderTypeFilter } from '@/features/billing/components/plan-order-filters'
import { usePlans } from '@/features/plans/api'
import type { AdminPlanOrderFilterName } from '@/features/plan-requests/types'

/* The admin Filters panel (Phase 0 decision 5): Plan — every plan, in the admin plans' order —
   next to the billing page's Type filter. "All Status" stays inline (billing's
   PlanOrderStatusFilter). Radix forbids "" as a value, so "all" = none. */

const ALL = 'all'

type Filters = Record<AdminPlanOrderFilterName, string>
type SetFilter = (name: AdminPlanOrderFilterName, value: string) => void

export function PlanRequestAdvancedFilters({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  return (
    <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
      <PlanFilter filters={filters} onChange={onChange} />
      <PlanOrderTypeFilter filters={filters} onChange={onChange} />
    </div>
  )
}

function PlanFilter({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('planRequests.list.filters')
  const plans = usePlans()
  const id = React.useId()

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-56">
      <Label htmlFor={id}>{t('planLabel')}</Label>
      <Select value={filters.plan_id || ALL} onValueChange={(value) => onChange('plan_id', value === ALL ? '' : value)}>
        <SelectTrigger id={id}>
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
    </div>
  )
}
