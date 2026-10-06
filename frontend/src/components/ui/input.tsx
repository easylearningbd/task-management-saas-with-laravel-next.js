import * as React from 'react'
import { cn } from '@/lib/cn'

/* design-system/components/Input.md — 36px field on `card`, 1px `input` border,
   `radius-lg`, 12px side padding. `aria-invalid` drives the error state.
   `affix`: "A unit or affix sits right-aligned inside the control in `muted-foreground`".
   Pass `null` (not undefined) while an affix is temporarily absent: the input keeps the same
   wrapper, so it isn't remounted (focus and form refs survive) when the affix appears. */
function Input({
  className,
  type = 'text',
  affix,
  ...props
}: React.ComponentProps<'input'> & { affix?: React.ReactNode }) {
  if (affix !== undefined) {
    return (
      <div className="relative">
        <Input type={type} className={cn(affix !== null && 'pr-9', className)} {...props} />
        {affix !== null ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-body text-muted-foreground"
          >
            {affix}
          </span>
        ) : null}
      </div>
    )
  }

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
