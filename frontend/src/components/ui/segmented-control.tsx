'use client'

import * as React from 'react'
import { ToggleGroup } from 'radix-ui'
import { cn } from '@/lib/cn'

/* The SegmentedControl from design-system/components/ViewToggle.md: the 44px text form used
   for Monthly / Yearly pricing — a `muted` track on `radius-tile` with 4px padding; the
   active segment is a `card` pill with `shadow-sm`, the others `muted-foreground`. A segment
   may carry an extra node after its label (e.g. the `Save 20%` pill).
   Built on Radix ToggleGroup (single): each segment is role="radio" with aria-checked inside
   a labelled group, with arrow-key roving focus. It never deselects to "nothing". */

export type SegmentedOption<T extends string> = { value: T; label: string; extra?: React.ReactNode }

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onValueChange: (value: T) => void
  /** Accessible name for the group, e.g. "Billing period". */
  label: string
  className?: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T) // ignore "deselect": one segment is always on
      }}
      aria-label={label}
      className={cn('inline-flex h-11 items-center gap-1 rounded-tile bg-muted p-1', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'inline-flex h-full min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-button whitespace-nowrap transition-colors',
            'text-muted-foreground hover:text-foreground',
            'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm',
            'focus-visible:shadow-focus focus-visible:outline-none',
          )}
        >
          {option.label}
          {option.extra}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
