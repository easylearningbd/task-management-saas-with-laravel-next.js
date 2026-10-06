'use client'

import * as React from 'react'
import { Calendar, Eye, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { RowActions } from '@/components/shared/row-actions'
import { StatusToggle } from '@/components/shared/status-toggle'
import { CodeChip } from '@/components/ui/code-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { useCouponFormat } from '@/features/coupons/format'
import type { Coupon, CouponSortKey } from '@/features/coupons/types'

/* The Coupons table's columns, in the screenshot's order:
   # (DataTable) · Name ↕ · Code ↕ · Type ↕ · Min Spend · Max Spend · Discount · Coupon Limit ·
   User Limit · Expiry Date ↕ · Status · Actions.
   Styling per the design system: the name in `title-row`, the code as a `code` chip, money in
   `money` (font-mono, brand-book.md), dates in `muted-foreground-alt` behind a Calendar glyph,
   "-" for empty cells, "Unlimited" spelled out, a switch for status and ghost icon actions. */

export type CouponRowHandlers = {
  onView: (coupon: Coupon) => void
  onEdit: (coupon: Coupon) => void
  onDelete: (coupon: Coupon) => void
  /** Persist the flipped status; reject to make the switch revert. */
  onToggle: (coupon: Coupon) => Promise<unknown>
  onToggleError: (error: unknown) => void
}

export function useCouponColumns(handlers: CouponRowHandlers): DataTableColumn<Coupon, CouponSortKey>[] {
  const t = useTranslations('coupons.list')
  const f = useCouponFormat()
  const { onView, onEdit, onDelete, onToggle, onToggleError } = handlers

  return React.useMemo<DataTableColumn<Coupon, CouponSortKey>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        sortKey: 'name',
        cell: (coupon) => <span className="text-title-row text-foreground">{coupon.name}</span>,
        skeleton: <Skeleton className="h-4 w-32" />,
      },
      {
        id: 'code',
        header: t('columns.code'),
        sortKey: 'code',
        cell: (coupon) => <CodeChip>{coupon.code}</CodeChip>,
        skeleton: <Skeleton className="h-7 w-24" />,
      },
      {
        id: 'type',
        header: t('columns.type'),
        sortKey: 'type',
        cell: (coupon) => coupon.type_label,
      },
      {
        id: 'min_spend',
        header: t('columns.minSpend'),
        cell: (coupon) => <Money value={f.money(coupon.min_spend)} />,
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      {
        id: 'max_spend',
        header: t('columns.maxSpend'),
        cell: (coupon) => <Money value={f.money(coupon.max_spend)} />,
        skeleton: <Skeleton className="h-4 w-16" />,
      },
      {
        id: 'discount',
        header: t('columns.discount'),
        cell: (coupon) => <Money value={coupon.discount_display} />,
        skeleton: <Skeleton className="h-4 w-12" />,
      },
      {
        id: 'usage_limit',
        header: t('columns.couponLimit'),
        cell: (coupon) => coupon.usage_limit_display,
        skeleton: <Skeleton className="h-4 w-14" />,
      },
      {
        id: 'per_user_limit',
        header: t('columns.userLimit'),
        cell: (coupon) => coupon.per_user_limit_display,
        skeleton: <Skeleton className="h-4 w-14" />,
      },
      {
        id: 'expiry_date',
        header: t('columns.expiryDate'),
        sortKey: 'expiry_date',
        cell: (coupon) =>
          coupon.expiry_date ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground-alt">
              <Calendar className="size-icon shrink-0" aria-hidden="true" />
              <time dateTime={coupon.expiry_date}>{coupon.expiry_date}</time>
            </span>
          ) : (
            '-'
          ),
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: (coupon) => (
          <StatusToggle
            checked={coupon.is_active}
            label={t('status.label', { name: coupon.name })}
            onToggle={() => onToggle(coupon)}
            onError={onToggleError}
          />
        ),
        skeleton: <Skeleton className="h-6 w-11 rounded-full" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (coupon) => (
          <RowActions
            actions={[
              { id: 'view', label: t('actions.view', { name: coupon.name }), tooltip: t('actions.viewTip'), icon: Eye, onClick: () => onView(coupon) },
              { id: 'edit', label: t('actions.edit', { name: coupon.name }), tooltip: t('actions.editTip'), icon: SquarePen, onClick: () => onEdit(coupon) },
              {
                id: 'delete',
                label: t('actions.delete', { name: coupon.name }),
                tooltip: t('actions.deleteTip'),
                icon: Trash2,
                tone: 'danger',
                onClick: () => onDelete(coupon),
              },
            ]}
          />
        ),
        skeleton: (
          <span className="inline-flex gap-1.5">
            <Skeleton className="size-control-sm rounded-lg" />
            <Skeleton className="size-control-sm rounded-lg" />
            <Skeleton className="size-control-sm rounded-lg" />
          </span>
        ),
      },
    ],
    [t, f, onView, onEdit, onDelete, onToggle, onToggleError],
  )
}

/** A currency figure in the `money` style; "-" stays plain. */
function Money({ value }: { value: string }) {
  return value === '-' ? '-' : <span className="font-mono text-money text-foreground">{value}</span>
}
