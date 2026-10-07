'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { GridCard } from '@/components/shared/card-grid'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { CreatedDate, PlanBadge, StatusBadge } from '@/features/companies/components/company-columns'
import type { Company } from '@/features/companies/types'

/* One company in the grid view (no screenshot — inferred, task spec): the same data as a table
   row on a Card.md surface — 48px avatar with name and email, the plan and status badges, the
   created date, and the same seven actions under a 1px rule. */
export function CompanyCard({ company, actions }: { company: Company; actions: RowAction[] }) {
  const t = useTranslations('companies.list')

  return (
    <GridCard className="flex flex-col">
      <IdentityCell name={company.name} secondary={company.email} seed={company.id} avatarSrc={company.avatar_url} size="md" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* On a card a missing plan is simply absent (the table's "-" placeholder would dangle). */}
        {company.plan ? <PlanBadge company={company} emptyLabel={t('noPlan')} /> : null}
        <StatusBadge company={company} />
      </div>
      <div className="mt-3 text-body-sm">
        <CreatedDate iso={company.created_at} />
      </div>
      <div className="mt-auto pt-4">
        <div className="-mx-card -mb-card border-t border-border px-card py-3">
          <RowActions actions={actions} className="flex w-full flex-wrap justify-between" />
        </div>
      </div>
    </GridCard>
  )
}

export function CompanyCardSkeleton() {
  return (
    <GridCard aria-hidden="true" className="flex flex-col">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="mt-3 h-4 w-24" />
      <div className="-mx-card -mb-card mt-4 flex justify-between border-t border-border px-card py-3">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="size-control-sm rounded-lg" />
        ))}
      </div>
    </GridCard>
  )
}
