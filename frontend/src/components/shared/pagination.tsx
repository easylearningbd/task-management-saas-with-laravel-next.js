'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/cn'

/* The table footer — design-system/components/Pagination.md + RowsPerPage.md.
   Left: "Showing 1 to 10 of 12 results" in `body-sm` `muted-foreground`.
   Right: "Rows per page:" with a compact select (10 / 25 / 50 / 100), then `control-height-sm`
   cells on `radius-lg` with a 1px `border` and `shadow-sm`: « Previous · pages · Next ». The
   current page is filled `primary` (aria-current="page"); the rest are `card`, `accent` on
   hover; the ends go `opacity-disabled`. Up to seven page cells: the first, the last and two
   either side of the current one, with "…" for the gaps. The page cells disappear when
   everything fits on one page — the count stays.
   Changing the page size keeps the first visible record in view instead of jumping to page 1. */

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const

export type PaginationProps = {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  /** The new size plus the page that keeps the current first record visible. */
  onPerPageChange: (perPage: number, page: number) => void
  perPageOptions?: ReadonlyArray<number>
  className?: string
}

export function Pagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  perPageOptions = PER_PAGE_OPTIONS,
  className,
}: PaginationProps) {
  const t = useTranslations('shared.pagination')
  const labelId = React.useId()
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(Math.max(1, page), lastPage)
  const from = total === 0 ? 0 : (current - 1) * perPage + 1
  const to = Math.min(current * perPage, total)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3', className)}>
      <p className="text-body-sm text-muted-foreground" aria-live="polite">
        {t('showing', { from, to, total })}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
          <span id={labelId}>{t('rowsPerPage')}</span>
          <Select
            value={String(perPage)}
            onValueChange={(value) => {
              const next = Number(value)
              onPerPageChange(next, pageKeepingRecord(from, next))
            }}
          >
            <SelectTrigger size="sm" aria-labelledby={labelId} className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {lastPage > 1 ? (
          <nav aria-label={t('label')} className="inline-flex flex-wrap items-center gap-1.5">
            <PageCell disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label={t('previousLabel')}>
              {t('previous')}
            </PageCell>
            {pageItems(current, lastPage).map((item, index) =>
              item === 'gap' ? (
                <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-body-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <PageCell
                  key={item}
                  active={item === current}
                  aria-current={item === current ? 'page' : undefined}
                  aria-label={t('page', { page: item })}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PageCell>
              ),
            )}
            <PageCell disabled={current >= lastPage} onClick={() => onPageChange(current + 1)} aria-label={t('nextLabel')}>
              {t('next')}
            </PageCell>
          </nav>
        ) : null}
      </div>
    </div>
  )
}

function PageCell({ active = false, className, ...props }: React.ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-control-sm min-w-control-sm items-center justify-center rounded-lg border px-2.5 text-button-sm shadow-sm transition-colors',
        'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-disabled',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:bg-accent disabled:hover:bg-card',
        className,
      )}
      {...props}
    />
  )
}

/** Page numbers to show: first, last and two either side of the current page; "gap" between. */
export function pageItems(current: number, lastPage: number): Array<number | 'gap'> {
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1)

  const pages = new Set<number>([1, lastPage])
  for (let p = current - 2; p <= current + 2; p++) if (p >= 1 && p <= lastPage) pages.add(p)

  const sorted = [...pages].sort((a, b) => a - b)
  const items: Array<number | 'gap'> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('gap')
    items.push(p)
  })
  return items
}

/** The page on which record `firstRecord` (1-based) lands at the new page size. */
export function pageKeepingRecord(firstRecord: number, perPage: number): number {
  return firstRecord <= 1 ? 1 : Math.floor((firstRecord - 1) / perPage) + 1
}
