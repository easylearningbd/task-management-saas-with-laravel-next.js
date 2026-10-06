'use client'

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/DateInput.md — a native <input type="date"> in the Input skin with
   a `Calendar` glyph in `muted-foreground` at `opacity-muted-icon`: leading in a filter bar's
   range pair, trailing in a form field. The empty state is the browser's own mm/dd/yyyy mask
   in `muted-foreground` — never a placeholder string. The value is always YYYY-MM-DD.
   CSS can't see whether a date input is empty, so `data-empty` is kept on the element itself
   (works for controlled inputs and for react-hook-form's uncontrolled refs alike). The native
   picker indicator is invisible but still opens the picker across the icon's area. */
function DateInput({
  className,
  iconPosition = 'trailing',
  ref,
  onInput,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'> & { iconPosition?: 'leading' | 'trailing' }) {
  const leading = iconPosition === 'leading'
  const inner = React.useRef<HTMLInputElement | null>(null)

  React.useImperativeHandle(ref, () => inner.current as HTMLInputElement)
  React.useLayoutEffect(() => {
    if (inner.current) inner.current.dataset.empty = String(inner.current.value === '')
  })

  return (
    <div className="relative">
      <input
        ref={inner}
        type="date"
        onInput={(event) => {
          event.currentTarget.dataset.empty = String(event.currentTarget.value === '')
          onInput?.(event)
        }}
        className={cn(
          'relative h-control w-full min-w-0 rounded-lg border border-input bg-card text-body text-foreground transition-colors',
          leading ? 'pr-3 pl-9' : 'pr-9 pl-3',
          'data-[empty=true]:text-muted-foreground',
          'hover:border-muted-foreground',
          'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-danger',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-disabled',
          '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0',
          '[&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-9',
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
          leading ? '[&::-webkit-calendar-picker-indicator]:left-0' : '[&::-webkit-calendar-picker-indicator]:right-0',
          className,
        )}
        {...props}
      />
      <Calendar
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 size-icon -translate-y-1/2 text-muted-foreground opacity-muted-icon',
          leading ? 'left-3' : 'right-3',
        )}
      />
    </div>
  )
}

export { DateInput }
