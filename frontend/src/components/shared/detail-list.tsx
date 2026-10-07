import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* Labelled read-only fields (PRD §4.2 "labelled fields") — shared by DetailsModal and the
   record pages' cards. A definition list: a `body-sm` `muted-foreground` label, with an
   optional leading icon, over a `body` value. Two columns by default (one on phones), or one.
   Empty values read "-". */

export type DetailItem = {
  id: string
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  /** Span both columns (long text). */
  wide?: boolean
}

export function DetailList({
  items,
  columns = 2,
  loading = false,
  className,
}: {
  items: ReadonlyArray<DetailItem>
  columns?: 1 | 2
  /** Shows skeleton values (e.g. while the record loads). */
  loading?: boolean
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4.5', columns === 2 && 'sm:grid-cols-2', className)}>
      {items.map(({ id, label, value, icon: Icon, wide }) => (
        <div key={id} className={cn('min-w-0', wide && 'sm:col-span-2')}>
          <dt className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
            {Icon ? <Icon className="size-icon shrink-0 opacity-muted-icon" aria-hidden="true" /> : null}
            {label}
          </dt>
          <dd className="mt-1 text-body break-words text-foreground">
            {loading ? <Skeleton className="h-5 w-32" /> : isBlank(value) ? '-' : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function isBlank(value: React.ReactNode): boolean {
  return value === null || value === undefined || value === ''
}
