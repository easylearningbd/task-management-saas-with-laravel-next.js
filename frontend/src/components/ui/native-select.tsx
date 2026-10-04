import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/* A native <select> in the Input skin at `control-height-sm` with a trailing ChevronDown —
   the chart year picker from design/admin-dashboard (its README: "native <select> in the
   Input skin at h-control-sm"). For full form selects use Select.md (Radix) instead. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <span className="relative inline-flex">
      <select
        className={cn(
          'h-control-sm appearance-none rounded-lg border border-input bg-card pr-8 pl-3 text-button-sm font-medium text-foreground shadow-sm transition-colors',
          'hover:border-muted-foreground focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  )
}

export { NativeSelect }
