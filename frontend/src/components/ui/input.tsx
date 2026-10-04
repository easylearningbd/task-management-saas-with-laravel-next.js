import * as React from 'react'
import { cn } from '@/lib/cn'

/* design-system/components/Input.md — 36px field on `card`, 1px `input` border,
   `radius-lg`, 12px side padding. `aria-invalid` drives the error state. */
function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'h-control w-full min-w-0 rounded-lg border border-input bg-card px-3 text-body text-foreground',
        'placeholder:text-muted-foreground transition-colors',
        'hover:border-muted-foreground',
        'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-danger',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-disabled',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
