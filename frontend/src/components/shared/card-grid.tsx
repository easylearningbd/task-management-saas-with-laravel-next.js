'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* The grid half of a list page's list/grid toggle (ViewToggle.md). No grid design exists, so
   it is composed from the system's own parts: cards (Card.md: `card`, 1px `border`,
   `radius-xl`, `shadow-xs`, `card-padding`) in a responsive grid — 1 column on phones, 2 from
   `sm`, 3 from `xl` — with the table's 16px gaps, then the same footer the table uses
   (pagination) in its own card. Same data and handlers as the table; the caller renders each
   card. Loading shows card-shaped skeletons; an EmptyState replaces the whole grid. */

export type CardGridProps<T> = {
  items: ReadonlyArray<T> | undefined
  getId: (item: T) => string | number
  renderCard: (item: T, index: number) => React.ReactNode
  /** Accessible name of the list. */
  label: string
  loading?: boolean
  skeletonCount?: number
  renderSkeleton?: () => React.ReactNode
  /** A refetch is running while cards are shown. */
  busy?: boolean
  empty?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function CardGrid<T>({
  items,
  getId,
  renderCard,
  label,
  loading = false,
  skeletonCount = 6,
  renderSkeleton = DefaultSkeleton,
  busy = false,
  empty,
  footer,
  className,
}: CardGridProps<T>) {
  const t = useTranslations('shared.table')
  const isEmpty = !loading && (items?.length ?? 0) === 0

  if (isEmpty && empty) {
    return <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-xs', className)}>{empty}</div>
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ul
        aria-label={label}
        aria-busy={loading || busy || undefined}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => <li key={index}>{renderSkeleton()}</li>)
          : items?.map((item, index) => <li key={getId(item)}>{renderCard(item, index)}</li>)}
      </ul>
      {loading ? (
        <span className="sr-only" role="status">
          {t('loading')}
        </span>
      ) : null}
      {footer && !isEmpty ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs">{footer}</div>
      ) : null}
    </div>
  )
}

/** The card surface (Card.md) for grid items — callers wrap their content in it. */
export function GridCard({ className, ...props }: React.ComponentProps<'article'>) {
  return <article className={cn('h-full rounded-xl border border-border bg-card p-card shadow-xs', className)} {...props} />
}

function DefaultSkeleton() {
  return (
    <GridCard aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="mt-5 h-8 w-full" />
    </GridCard>
  )
}
