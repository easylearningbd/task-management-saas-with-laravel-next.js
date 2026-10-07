'use client'

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/features/companies/format'
import type { Company, CompanySortKey } from '@/features/companies/types'

/* The Companies table, in the screenshot's order:
   # (DataTable) · Name ↕ (avatar + name + email) · Plan · Status ↕ · Created At ↕ · Actions.
   Plan: one `info` badge style for every plan (brand-book.md: plan names are always `info`),
   "-" without a plan (Table.md). Status: `success` "Active" / `neutral` "Inactive" — it never
   reflects login. Badges use the outlined variant, as on the Plans page. */

export function useCompanyColumns(actionsFor: (company: Company) => RowAction[]): DataTableColumn<Company, CompanySortKey>[] {
  const t = useTranslations('companies.list')

  return React.useMemo<DataTableColumn<Company, CompanySortKey>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        sortKey: 'name',
        className: 'w-[40%]',
        cell: (company) => (
          <IdentityCell name={company.name} secondary={company.email} seed={company.id} avatarSrc={company.avatar_url} size="row" />
        ),
        skeleton: (
          <span className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <span className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </span>
          </span>
        ),
      },
      {
        id: 'plan',
        header: t('columns.plan'),
        cell: (company) => <PlanBadge company={company} emptyLabel={t('noPlan')} />,
        skeleton: <Skeleton className="h-6 w-12" />,
      },
      {
        id: 'status',
        header: t('columns.status'),
        sortKey: 'status',
        cell: (company) => <StatusBadge company={company} />,
        skeleton: <Skeleton className="h-6 w-14" />,
      },
      {
        id: 'created_at',
        header: t('columns.createdAt'),
        sortKey: 'created_at',
        cell: (company) => <CreatedDate iso={company.created_at} />,
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (company) => <RowActions actions={actionsFor(company)} />,
        skeleton: (
          <span className="inline-flex gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="size-control-sm rounded-lg" />
            ))}
          </span>
        ),
      },
    ],
    [t, actionsFor],
  )
}

export function PlanBadge({ company, emptyLabel }: { company: Pick<Company, 'plan'>; emptyLabel: string }) {
  return company.plan ? (
    <Badge tone="info" outlined>
      {company.plan.name}
    </Badge>
  ) : (
    <span className="text-muted-foreground">{emptyLabel}</span>
  )
}

export function StatusBadge({ company }: { company: Pick<Company, 'status' | 'status_label'> }) {
  return (
    <Badge tone={company.status === 'active' ? 'success' : 'neutral'} outlined>
      {company.status_label}
    </Badge>
  )
}

/** A date in `muted-foreground-alt` behind a Calendar glyph (Table.md); "-" when missing. */
export function CreatedDate({ iso }: { iso: string | null }) {
  const date = formatDate(iso)
  return date ? (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground-alt">
      <Calendar className="size-icon shrink-0" aria-hidden="true" />
      <time dateTime={iso ?? undefined}>{date}</time>
    </span>
  ) : (
    '-'
  )
}
