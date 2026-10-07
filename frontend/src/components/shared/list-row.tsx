import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* A row in a card's short list — the deadline, contract and task rows of
   design/user-dashboard (panels.tsx): a 36px `primary-soft` tile with a 16px `primary`
   glyph, a `title-row` line over a `body-sm` muted line (both truncate), and a right-hand
   column stacked to the end (a date, an amount, a badge, a time). Rows are split by 1px
   `border` rules and run edge to edge at `card-padding`. `relaxed` is the 14px-tall
   padding of the deadline list; the default is 12px. */

export function ListRows({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className={cn('divide-y divide-border', className)}>
      {children}
    </ul>
  )
}

export function ListRow({
  icon: Icon,
  title,
  subtitle,
  aside,
  density = 'default',
}: {
  icon: LucideIcon
  title: string
  /** A string renders as the muted second line; pass a node for anything richer. */
  subtitle?: React.ReactNode
  /** Right-hand column, stacked and end-aligned. */
  aside?: React.ReactNode
  density?: 'default' | 'relaxed'
}) {
  return (
    <li className={cn('flex items-center gap-3 px-card', density === 'relaxed' ? 'py-3.5' : 'py-3')}>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-icon" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-title-row">{title}</p>
        {typeof subtitle === 'string' ? <p className="truncate text-body-sm text-muted-foreground">{subtitle}</p> : subtitle}
      </div>
      {aside ? <div className="flex shrink-0 flex-col items-end gap-1">{aside}</div> : null}
    </li>
  )
}
