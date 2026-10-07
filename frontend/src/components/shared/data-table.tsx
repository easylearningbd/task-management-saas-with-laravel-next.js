'use client'

import * as React from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* design-system/components/Table.md — the table lives in a card with no body padding so rows
   run edge to edge; `radius-xl` clips the first and last row. Header row `table-header-height`
   on `table-header` with `table-head` labels in `muted-foreground`; sortable headers carry a
   trailing double-chevron at 70% opacity. Body rows are `table-row-height` with a 1px `border`
   rule between them — none above the first row, no zebra, no vertical rules — and take
   `accent` on hover. A `#` index column in `muted-foreground` comes first; empty cells read "-".
   An EmptyState replaces the whole table (never a header over an empty body).

   Narrow screens: the table scrolls sideways inside its card (the Coupons task's call; Table.md
   suggests stacked cards below ~640px — left for a later option). The scroll area is a
   focusable region so keyboard users can scroll it. The header is sticky within the scroll
   area — it sticks when the area has a bounded height (`scrollAreaClassName="max-h-…"`).

   Density: `default` is Table.md (`table-header-height` 44px, `table-row-height` 60px — sized
   for an avatar over two lines); `compact` is for single-line tables, measured from the
   Coupons screenshot (48px header, 52px rows); `relaxed` is for identity rows (avatar + two
   lines), measured from the Companies screenshot (48px header, `table-row-height` rows).

   Sorting is controlled: the table only reports clicks through onSortChange (asc → desc →
   asc). Sortable headers are real buttons inside a <th aria-sort>. */

export type SortDirection = 'asc' | 'desc'

export type SortState<K extends string = string> = { key: K; direction: SortDirection }

export type DataTableColumn<T, K extends string = string> = {
  id: string
  header: React.ReactNode
  /** Makes the column sortable under this key. */
  sortKey?: K
  align?: 'left' | 'center' | 'right'
  /** Applied to the <th> and every <td> (e.g. a width). */
  className?: string
  cell: (row: T, index: number) => React.ReactNode
  /** Loading placeholder for this column's cells (default: a short bar). */
  skeleton?: React.ReactNode
}

export type DataTableProps<T, K extends string = string> = {
  columns: ReadonlyArray<DataTableColumn<T, K>>
  rows: ReadonlyArray<T> | undefined
  getRowId: (row: T) => string | number
  /** Accessible name for the table (and its scroll region). */
  label: string
  sort?: SortState<K> | null
  onSortChange?: (sort: SortState<K>) => void
  /** Adds the leading `#` column, numbered from offset + 1 (so it continues across pages). */
  rowNumberOffset?: number
  /** First load: header plus skeleton rows. */
  loading?: boolean
  skeletonRows?: number
  /** A refetch is running while rows are shown (e.g. a page change). */
  busy?: boolean
  /** Shown instead of the table when there are no rows (and not loading). */
  empty?: React.ReactNode
  /** Footer under a 1px rule (pagination); hidden while empty. */
  footer?: React.ReactNode
  density?: 'default' | 'compact' | 'relaxed'
  className?: string
  scrollAreaClassName?: string
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

const HEIGHTS = {
  default: { head: 'h-thead', row: 'h-row' },
  compact: { head: 'h-12', row: 'h-13' },
  relaxed: { head: 'h-12', row: 'h-row' },
} as const

export function DataTable<T, K extends string = string>({
  columns,
  rows,
  getRowId,
  label,
  sort,
  onSortChange,
  rowNumberOffset,
  loading = false,
  skeletonRows = 10,
  busy = false,
  empty,
  footer,
  density = 'default',
  className,
  scrollAreaClassName,
}: DataTableProps<T, K>) {
  const heights = HEIGHTS[density]
  const t = useTranslations('shared.table')
  const showNumbers = rowNumberOffset !== undefined
  const isEmpty = !loading && (rows?.length ?? 0) === 0

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-xs', className)}>
      {isEmpty && empty ? (
        empty
      ) : (
        <div
          role="region"
          aria-label={label}
          tabIndex={0}
          className={cn('overflow-auto focus-visible:shadow-focus focus-visible:outline-none', scrollAreaClassName)}
        >
          <table className="w-full text-body" aria-busy={loading || busy || undefined}>
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className={heights.head}>
                {showNumbers ? (
                  <th scope="col" className={cn(headClass, 'w-14')}>
                    {t('rowNumber')}
                  </th>
                ) : null}
                {columns.map((column) => (
                  <HeaderCell key={column.id} column={column} sort={sort} onSortChange={onSortChange} sortLabel={t('sortBy', { column: typeof column.header === 'string' ? column.header : column.id })} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: skeletonRows }, (_, index) => (
                    <tr key={index} className={cn(heights.row, 'border-t border-border first:border-t-0')}>
                      {showNumbers ? (
                        <td className="px-4">
                          <Skeleton className="h-4 w-4" />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={column.id} className={cn('px-4', column.className)}>
                          <div className={cn('flex', column.align === 'right' && 'justify-end', column.align === 'center' && 'justify-center')}>
                            {column.skeleton ?? <Skeleton className="h-4 w-20" />}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                : rows?.map((row, index) => (
                    <tr
                      key={getRowId(row)}
                      className={cn(heights.row, 'border-t border-border transition-colors first:border-t-0 hover:bg-accent')}
                    >
                      {showNumbers ? (
                        <td className="px-4 whitespace-nowrap text-muted-foreground">{rowNumberOffset + index + 1}</td>
                      ) : null}
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn('px-4 whitespace-nowrap', ALIGN[column.align ?? 'left'], column.className)}
                        >
                          {column.cell(row, index)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
          {loading ? <span className="sr-only" role="status">{t('loading')}</span> : null}
        </div>
      )}
      {footer && !isEmpty ? <div className="border-t border-border px-4 py-3.5">{footer}</div> : null}
    </div>
  )
}

const headClass =
  'sticky top-0 z-10 bg-table-header px-4 text-left text-table-head font-medium whitespace-nowrap text-muted-foreground'

function HeaderCell<T, K extends string>({
  column,
  sort,
  onSortChange,
  sortLabel,
}: {
  column: DataTableColumn<T, K>
  sort?: SortState<K> | null
  onSortChange?: (sort: SortState<K>) => void
  sortLabel: string
}) {
  const align = ALIGN[column.align ?? 'left']
  const sortKey = column.sortKey
  if (sortKey === undefined || !onSortChange) {
    return (
      <th scope="col" className={cn(headClass, align, column.className)}>
        {column.header}
      </th>
    )
  }

  const active = sort?.key === sortKey ? sort.direction : null
  const Icon = active === 'asc' ? ChevronUp : active === 'desc' ? ChevronDown : ChevronsUpDown

  return (
    <th
      scope="col"
      aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
      className={cn(headClass, align, column.className)}
    >
      <button
        type="button"
        title={sortLabel}
        onClick={() => onSortChange({ key: sortKey, direction: active === 'asc' ? 'desc' : 'asc' })}
        className={cn(
          '-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium transition-colors hover:text-foreground',
          'focus-visible:shadow-focus focus-visible:outline-none',
          active && 'text-foreground',
        )}
      >
        {column.header}
        <Icon className={cn('size-3.5 shrink-0', !active && 'opacity-70')} aria-hidden="true" />
      </button>
    </th>
  )
}
