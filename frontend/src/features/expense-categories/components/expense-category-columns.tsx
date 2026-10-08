'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExpenseCategory, ExpenseCategorySortKey } from '@/features/expense-categories/types'

/* The Expense Categories table, in the screenshot's order — and, unlike every other list, no
   `#` column:
   Name ↕ (name over its muted description) · Color (swatch + hex) · Status · Actions.
   Name takes the free width and truncates (a description may be 1000 characters; the full
   text is in the title), but never below 192px, so it stays readable when the table scrolls on
   a phone. Color: a 16px `radius-sm` swatch and the hex in monospace at the `code` size
   (13px / 500 — written `text-body-sm font-medium`, because `text-code` also names the code
   chip's background colour and would paint the text with it; Phase 0 decision 6).
   Status: `success` "Active" / `neutral` "Inactive" (the spec, and the Companies list). */

export function useExpenseCategoryColumns(
  actionsFor: (category: ExpenseCategory) => RowAction[],
): DataTableColumn<ExpenseCategory, ExpenseCategorySortKey>[] {
  const t = useTranslations('expenseCategories.list')

  return React.useMemo<DataTableColumn<ExpenseCategory, ExpenseCategorySortKey>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        sortKey: 'name',
        // Takes the remaining width and lets its text truncate instead of widening the table.
        className: 'w-full min-w-48 max-w-0',
        cell: (category) => (
          <div className="min-w-0 py-3">
            <p className="truncate text-title-row" title={category.name}>
              {category.name}
            </p>
            {category.description ? (
              <p className="truncate text-body-sm text-muted-foreground" title={category.description}>
                {category.description}
              </p>
            ) : null}
          </div>
        ),
        skeleton: (
          <span className="flex flex-col gap-1.5 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-48" />
          </span>
        ),
      },
      {
        id: 'color',
        header: t('columns.color'),
        cell: (category) => <ColorValue color={category.color} />,
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: (category) => <ExpenseCategoryStatusBadge category={category} />,
        skeleton: <Skeleton className="h-6 w-14" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (category) => <RowActions actions={actionsFor(category)} />,
        skeleton: (
          <span className="inline-flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="size-control-sm rounded-lg" />
            ))}
          </span>
        ),
      },
    ],
    [t, actionsFor],
  )
}

/** A colour as the screenshot shows it: a small swatch, then the uppercase hex in monospace. */
export function ColorValue({ color }: { color: string }) {
  const hex = color.toUpperCase()
  return (
    <span className="inline-flex items-center gap-2">
      {/* The colour itself is data (the category's), not a design token. */}
      <span aria-hidden="true" className="size-icon shrink-0 rounded-sm" style={{ backgroundColor: hex }} />
      <span className="font-mono text-body-sm font-medium">{hex}</span>
    </span>
  )
}

export function ExpenseCategoryStatusBadge({ category }: { category: Pick<ExpenseCategory, 'status' | 'status_label'> }) {
  return (
    <Badge tone={category.status === 'active' ? 'success' : 'neutral'} outlined>
      {category.status_label}
    </Badge>
  )
}
