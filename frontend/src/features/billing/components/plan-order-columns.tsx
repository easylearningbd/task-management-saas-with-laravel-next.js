'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { IdentityCell } from '@/components/shared/identity-cell'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreatedDate } from '@/features/companies/components/company-columns'
import type { PlanOrder, PlanOrderSortKey, PlanOrderStatus } from '@/features/billing/types'

/* The Plan Requests table, exactly as the screenshot draws it:
   # (DataTable) · Company ↕ (avatar, name, email) · Plan ↕ · Plan Duration · Status · Requested At ↕.
   Plan: the soft `info` badge (brand-book.md: plan names are always `info`; no hairline, as drawn).
   Status: outlined `success` Approved / `warning` Pending / `danger` Rejected (Badge.md's status
   tones; the screenshot shows the hairline). Requested At: the shared Calendar date (YYYY-MM-DD).
   Widths are measured from the 1440px screenshot; there are no row actions — the row opens the
   details modal. */

const STATUS_TONE: Record<PlanOrderStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
}

export function usePlanOrderColumns(): DataTableColumn<PlanOrder, PlanOrderSortKey>[] {
  const t = useTranslations('billing.requests.columns')

  return React.useMemo<DataTableColumn<PlanOrder, PlanOrderSortKey>[]>(
    () => [
      {
        id: 'company',
        header: t('company'),
        sortKey: 'company',
        className: 'w-[32%]',
        cell: (order) =>
          order.company ? (
            <IdentityCell
              name={order.company.name}
              secondary={order.company.email}
              seed={order.company.id}
              avatarSrc={order.company.avatar_url}
              size="row"
              className="max-w-72"
            />
          ) : (
            '-'
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
        header: t('plan'),
        sortKey: 'plan',
        className: 'w-[14%]',
        cell: (order) => (order.plan ? <PlanNameBadge name={order.plan.name} /> : '-'),
        skeleton: <Skeleton className="h-6 w-14" />,
      },
      {
        id: 'duration',
        header: t('duration'),
        className: 'w-[17%]',
        cell: (order) => order.duration_label,
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      {
        id: 'status',
        header: t('status'),
        className: 'w-[15%]',
        cell: (order) => <PlanOrderStatusBadge order={order} />,
        skeleton: <Skeleton className="h-6 w-16" />,
      },
      {
        id: 'requested_at',
        header: t('requestedAt'),
        sortKey: 'requested_at',
        cell: (order) => <CreatedDate iso={order.created_at} />,
        skeleton: <Skeleton className="h-4 w-24" />,
      },
    ],
    [t],
  )
}

export function PlanNameBadge({ name }: { name: string }) {
  return <Badge tone="info">{name}</Badge>
}

export function PlanOrderStatusBadge({ order }: { order: Pick<PlanOrder, 'status' | 'status_label'> }) {
  return (
    <Badge tone={STATUS_TONE[order.status]} outlined>
      {order.status_label}
    </Badge>
  )
}
