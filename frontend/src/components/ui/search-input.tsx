'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/SearchInput.md — an Input at `control-height-lg` with a leading
   `Search` glyph (`icon-size`, `muted-foreground` at `opacity-muted-icon`, 8px from the text).
   Once there is a query, an X clear button appears right-aligned inside the field.
   Sizes: `lg` (the spec's `control-height-lg`), `default` (`control-height`, beside a
   default-size button) and `sm` (`control-height-sm`, the compact filter bar measured from the
   Coupons screenshot).
   Controlled and immediate — debouncing belongs to the caller (FilterBar does 300ms). */
function SearchInput({
  value,
  onValueChange,
  onClear,
  clearLabel,
  size = 'lg',
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'size'> & {
  size?: 'lg' | 'default' | 'sm'
  value: string
  onValueChange: (value: string) => void
  /** Called by the X button (defaults to clearing via onValueChange). */
  onClear?: () => void
  /** aria-label for the X button. */
  clearLabel: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-icon -translate-y-1/2 text-muted-foreground opacity-muted-icon"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          size === 'sm' ? 'h-control-sm' : size === 'default' ? 'h-control' : 'h-control-lg',
          'w-full min-w-0 rounded-lg border border-input bg-card pr-9 pl-9 text-body text-foreground transition-colors',
          'placeholder:text-muted-foreground hover:border-muted-foreground',
          'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...props}
      />
      {value !== '' ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            if (onClear) onClear()
            else onValueChange('')
            inputRef.current?.focus()
          }}
          className={cn(
            'absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            'focus-visible:shadow-focus focus-visible:outline-none',
          )}
        >
          <X className="size-icon" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export { SearchInput }
