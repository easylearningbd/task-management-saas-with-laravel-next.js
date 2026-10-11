'use client'

import * as React from 'react'
import { LayoutGrid, List, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/ViewToggle.md — two 34×26 icon buttons in a 3px-padded `card`
   shell with a 1px `border` and `shadow-sm`, at the right end of a filter bar. The active view
   is filled `primary` with a `primary-foreground` icon; the other is `muted-foreground` and
   takes `accent` on hover. By default the two options are `List` and `LayoutGrid`
   (`listLabel` / `gridLabel`); `options` swaps in other views with the same look (the Tasks
   page's board = `Columns2` / list = `List`). Each button has an aria-label and aria-pressed.
   (The caller persists the choice per table.) */

export type ViewMode = 'list' | 'grid'

export type ViewOption<V extends string> = { value: V; icon: LucideIcon; label: string }

type ViewToggleProps<V extends string> = {
  value: V
  onValueChange: (value: V) => void
  /** Group name, e.g. "View". */
  label: string
  className?: string
} & (
  | { options: ReadonlyArray<ViewOption<V>>; listLabel?: never; gridLabel?: never }
  | { options?: never; listLabel: string; gridLabel: string }
)

export function ViewToggle<V extends string = ViewMode>(props: ViewToggleProps<V>) {
  const { value, onValueChange, label, className } = props
  const options: ReadonlyArray<ViewOption<string>> = props.options ?? [
    { value: 'list', icon: List, label: props.listLabel },
    { value: 'grid', icon: LayoutGrid, label: props.gridLabel },
  ]

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-[3px] shadow-sm', className)}
    >
      {options.map(({ value: option, icon: Icon, label: optionLabel }) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            aria-label={optionLabel}
            aria-pressed={active}
            // Without `options` the values are list / grid, i.e. V is ViewMode.
            onClick={() => onValueChange(option as V)}
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
