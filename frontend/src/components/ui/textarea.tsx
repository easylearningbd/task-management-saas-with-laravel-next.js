import * as React from 'react'
import { cn } from '@/lib/cn'

/* design-system/components/Textarea.md — the Input skin at three rows with 10px vertical
   padding; the browser resize grip stays on, vertical only. `aria-invalid` drives the error
   state exactly like Input. */
function Textarea({ className, rows = 3, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'min-h-[92px] w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-body text-foreground',
        'placeholder:text-muted-foreground transition-colors hover:border-muted-foreground',
        'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-danger',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-disabled',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
