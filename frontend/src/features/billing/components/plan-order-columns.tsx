'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowActionItem } from '@/components/shared/row-actions'
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
   details modal.
   Shared with the admin Plan Requests page (one table, never forked): it passes its own sort keys
   (the admin list sorts Requested At as `created_at`), the admin screenshot's widths, and an
   Actions column — right-aligned RowActions, empty for a row that returns none (only pending rows
   get ✓ / ✗). The company page calls it with no options and is unchanged. */

type ColumnWidths = { company: string; plan: string; duration: string; status: string; requestedAt: string }

export type PlanOrderColumnOptions<T extends PlanOrder, K extends string> = {
  sortKeys: { company: K; plan: K; requestedAt: K }
  widths?: ColumnWidths
  /** An Actions column; `items` returns null (or nothing) for a row without actions. */
  actions?: { header: string; items: (order: T) => ReadonlyArray<RowActionItem> | null }
}

const COMPANY_OPTIONS: PlanOrderColumnOptions<PlanOrder, PlanOrderSortKey> = {
  sortKeys: { company: 'company', plan: 'plan', requestedAt: 'requested_at' },
}

const DEFAULT_WIDTHS: ColumnWidths = { company: 'w-[32%]', plan: 'w-[14%]', duration: 'w-[17%]', status: 'w-[15%]', requestedAt: '' }

const STATUS_TONE: Record<PlanOrderStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
}

export function usePlanOrderColumns(): DataTableColumn<PlanOrder, PlanOrderSortKey>[]
export function usePlanOrderColumns<T extends PlanOrder, K extends string>(options: PlanOrderColumnOptions<T, K>): DataTableColumn<T, K>[]
export function usePlanOrderColumns<T extends PlanOrder, K extends string>(options?: PlanOrderColumnOptions<T, K>): DataTableColumn<T, K>[] {
  const t = useTranslations('billing.requests.columns')
  const { sortKeys, widths = DEFAULT_WIDTHS, actions } = (options ?? COMPANY_OPTIONS) as PlanOrderColumnOptions<T, K>

  return React.useMemo<DataTableColumn<T, K>[]>(
    () => [
      {
        id: 'company',
        header: t('company'),
        sortKey: sortKeys.company,
        className: widths.company,
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
        sortKey: sortKeys.plan,
        className: widths.plan,
        cell: (order) => (order.plan ? <PlanNameBadge name={order.plan.name} /> : '-'),
        skeleton: <Skeleton className="h-6 w-14" />,
      },
      {
        id: 'duration',
        header: t('duration'),
        className: widths.duration,
        cell: (order) => order.duration_label,
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      {
        id: 'status',
        header: t('status'),
        className: widths.status,
        cell: (order) => <PlanOrderStatusBadge order={order} />,
        skeleton: <Skeleton className="h-6 w-16" />,
      },
      {
        id: 'requested_at',
        header: t('requestedAt'),
        sortKey: sortKeys.requestedAt,
        className: widths.requestedAt || undefined,
        cell: (order) => <CreatedDate iso={order.created_at} />,
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      ...(actions
        ? [
            {
              id: 'actions',
              header: actions.header,
              align: 'right' as const,
              cell: (order: T) => {
                const items = actions.items(order)
                return items && items.length > 0 ? <RowActions actions={items} /> : null
              },
              skeleton: (
                <span className="inline-flex gap-1.5">
                  <Skeleton className="size-control-sm rounded-lg" />
                  <Skeleton className="size-control-sm rounded-lg" />
                </span>
              ),
            },
          ]
        : []),
    ],
    [t, sortKeys.company, sortKeys.plan, sortKeys.requestedAt, widths, actions],
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
