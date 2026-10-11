import * as React from 'react'
import { Card, CardHeading } from '@/components/ui/card'
import { cn } from '@/lib/cn'

/* A purchase summary (the checkout's "Order Summary") — not in the design system; Card.md with the
   divided heading, then a definition list of rows (`body` muted label left, `body` value right;
   money in the caller's `text-money` / font-mono), a 1px `border` rule, and the total row in bold
   (`title-card`). `children` render under it — the submit button and its note. Sticky placement
   is the caller's (`className`, e.g. `lg:sticky lg:top-…`). */

export type SummaryRow = { id: string; label: string; value: React.ReactNode }

export function OrderSummaryCard({
  title,
  rows,
  total,
  children,
  className,
}: {
  title: string
  rows: ReadonlyArray<SummaryRow>
  total: { label: string; value: React.ReactNode }
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeading divided title={title} />
      <div className="p-card">
        <dl className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.id} className="flex items-baseline justify-between gap-4">
              <dt className="text-body text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 text-right text-body break-words">{row.value}</dd>
            </div>
          ))}
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
            <dt className="text-title-card">{total.label}</dt>
            <dd className="text-right text-title-card">{total.value}</dd>
          </div>
        </dl>
        {children ? <div className="mt-6 flex flex-col gap-3">{children}</div> : null}
      </div>
    </Card>
  )
}
