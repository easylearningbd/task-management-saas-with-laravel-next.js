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
   aria-label naming the action and its record, plus a tooltip.
   `disabledReason`: an action that doesn't apply to this row but should say why (a Completed
   project's lock) — the button stays focusable and hoverable so its tooltip (the reason) can
   be read, is announced as disabled (aria-disabled), looks disabled (`opacity-disabled`) and
   does nothing. Plain `disabled` still removes the button from the tab order. */

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
  /** Not applicable here, and why — shown as the tooltip; the button does nothing. */
  disabledReason?: string
}

export function RowActions({ actions, className }: { actions: ReadonlyArray<RowAction>; className?: string }) {
  return (
    <div className={cn('inline-flex items-center justify-end gap-1.5', className)}>
      {actions.map(({ id, label, tooltip, icon: Icon, onClick, tone = 'default', disabled, disabledReason }) => (
        <Tooltip key={id} content={disabledReason ?? tooltip ?? label}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-disabled={disabledReason ? true : undefined}
            aria-description={disabledReason}
            disabled={disabled}
            onClick={disabledReason ? undefined : onClick}
            className={cn(
              tone === 'danger' && 'hover:bg-danger-soft hover:text-danger',
              disabledReason && 'cursor-not-allowed opacity-disabled hover:bg-transparent hover:text-muted-foreground',
            )}
          >
            <Icon className="size-icon" aria-hidden="true" />
          </Button>
        </Tooltip>
      ))}
    </div>
  )
}
