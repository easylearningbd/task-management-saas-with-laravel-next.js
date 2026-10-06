'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* A table row's actions — design-system/components/ButtonGhost.md + brand-book.md: a
   right-aligned run of `control-height-sm` ghost icon buttons (`icon-size` glyph in
   `muted-foreground`, `accent` + `foreground` on hover; delete goes `danger` on `danger-soft`).
   Order is the caller's, following the spec: open, details, billing, credentials, edit,
   delete — delete always last. Six at most (past that, a DropdownMenu). Every button has an
   aria-label naming the action and its record, plus a tooltip. */

export type RowAction = {
  id: string
  /** Accessible name, e.g. "Edit Summer Sale". */
  label: string
  /** Tooltip text; defaults to `label`. */
  tooltip?: string
  icon: LucideIcon
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export function RowActions({ actions, className }: { actions: ReadonlyArray<RowAction>; className?: string }) {
  return (
    <div className={cn('inline-flex items-center justify-end gap-1.5', className)}>
      {actions.map(({ id, label, tooltip, icon: Icon, onClick, tone = 'default', disabled }) => (
        <Tooltip key={id} content={tooltip ?? label}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(tone === 'danger' && 'hover:bg-danger-soft hover:text-danger')}
          >
            <Icon className="size-icon" aria-hidden="true" />
          </Button>
        </Tooltip>
      ))}
    </div>
  )
}
