'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* One repeatable line of a form (the invoice's items) — not in the design system; Card.md's parts:
   a 1px `border` box on `radius-xl` with `card` ground and 12px padding (cards never nest, so this
   is a bordered region, not a Card). Its cells sit on the caller's grid (`gridClassName`, the same
   template as LineItemHeader so the columns line up); the last cell holds two ghost `icon-sm`
   buttons (RowActions' style): a chevron that shows / hides the row's detail (the description
   textarea, under the cells) and a trash that removes the row — `danger` on hover, disabled (with
   the reason as its tooltip) when the row can't go (the last remaining one). Below `md` the cells
   stack and the header hides. Cells align at the top (a message under one cell doesn't shift the
   others); the action buttons centre on the control height. Nothing here knows what a line holds. */

export function LineItemHeader({
  labels,
  gridClassName,
  className,
}: {
  /** One label per cell, then the action column's. */
  labels: ReadonlyArray<React.ReactNode>
  gridClassName: string
  className?: string
}) {
  return (
    // The rows' 1px border and 12px padding, transparent, so the labels sit over their cells.
    <div aria-hidden="true" className={cn('hidden gap-3 border-x border-transparent px-3 pb-2 text-body font-semibold md:grid', gridClassName, className)}>
      {labels.map((label, index) => (
        <span key={index} className={cn('min-w-0 truncate', index === labels.length - 1 && 'text-right')}>
          {label}
        </span>
      ))}
    </div>
  )
}

export function LineItemRow({
  cells,
  detail,
  expanded,
  onToggle,
  onRemove,
  removeDisabledReason,
  toggleLabel,
  removeLabel,
  gridClassName,
  className,
}: {
  /** The row's cells, in the header's order. */
  cells: ReadonlyArray<React.ReactNode>
  /** Shown under the cells while expanded (e.g. the description). */
  detail?: React.ReactNode
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
  /** Set when the row can't be removed — the trash is disabled with this as its tooltip. */
  removeDisabledReason?: string
  /** e.g. "Hide the description of line 2" */
  toggleLabel: string
  /** e.g. "Remove line 2" */
  removeLabel: string
  gridClassName: string
  className?: string
}) {
  const Chevron = expanded ? ChevronUp : ChevronDown
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3', className)}>
      <div className={cn('grid grid-cols-1 items-start gap-3', gridClassName)}>
        {cells.map((cell, index) => (
          <div key={index} className="min-w-0">
            {cell}
          </div>
        ))}
        <div className="flex items-center justify-end gap-1.5 md:h-control">
          {detail !== undefined ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={toggleLabel} aria-expanded={expanded} onClick={onToggle}>
              <Chevron className="size-icon" aria-hidden="true" />
            </Button>
          ) : null}
          <Tooltip content={removeDisabledReason ?? removeLabel}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={removeLabel}
              aria-disabled={removeDisabledReason ? true : undefined}
              aria-description={removeDisabledReason}
              onClick={removeDisabledReason ? undefined : onRemove}
              className={cn(
                'hover:bg-danger-soft hover:text-danger',
                removeDisabledReason && 'cursor-not-allowed opacity-disabled hover:bg-transparent hover:text-muted-foreground',
              )}
            >
              <Trash2 className="size-icon" aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
      </div>
      {detail !== undefined && expanded ? <div className="mt-3">{detail}</div> : null}
    </div>
  )
}
