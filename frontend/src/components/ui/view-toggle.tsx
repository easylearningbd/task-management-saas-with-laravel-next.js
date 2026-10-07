'use client'

import * as React from 'react'
import { LayoutGrid, List, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/ViewToggle.md — two 34×26 icon buttons in a 3px-padded `card`
   shell with a 1px `border` and `shadow-sm`, at the right end of a filter bar. The active view
   is filled `primary` with a `primary-foreground` icon; the other is `muted-foreground` and
   takes `accent` on hover. Exactly two options, `List` and `LayoutGrid`; each button has an
   aria-label and aria-pressed. (The caller persists the choice per table.) */

export type ViewMode = 'list' | 'grid'

const OPTIONS: ReadonlyArray<{ value: ViewMode; icon: LucideIcon }> = [
  { value: 'list', icon: List },
  { value: 'grid', icon: LayoutGrid },
]

export function ViewToggle({
  value,
  onValueChange,
  label,
  listLabel,
  gridLabel,
  className,
}: {
  value: ViewMode
  onValueChange: (value: ViewMode) => void
  /** Group name, e.g. "View". */
  label: string
  listLabel: string
  gridLabel: string
  className?: string
}) {
  const labels: Record<ViewMode, string> = { list: listLabel, grid: gridLabel }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-[3px] shadow-sm', className)}
    >
      {OPTIONS.map(({ value: option, icon: Icon }) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            aria-label={labels[option]}
            aria-pressed={active}
            onClick={() => onValueChange(option)}
            className={cn(
              'inline-flex h-6.5 w-8.5 items-center justify-center rounded-md transition-colors',
              'focus-visible:shadow-focus focus-visible:outline-none',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-icon" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
