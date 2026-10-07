import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/* A native <select> in the Input skin with a trailing ChevronDown.
   - sm (default): `control-height-sm`, `button-sm` 500 text, 14px chevron — the chart year
     picker from design/admin-dashboard (its README: "native <select> in the Input skin at
     h-control-sm").
   - default: `control-height`, `body` text, 16px chevron 12px from the edge — the Project
     Progress picker in design/user-dashboard (panels.tsx).
   For full form selects use Select.md (Radix) instead. */
const SIZES = {
  sm: { select: 'h-control-sm text-button-sm font-medium shadow-sm', chevron: 'right-2.5 size-3.5' },
  default: { select: 'h-control text-body', chevron: 'right-3 size-icon' },
} as const

function NativeSelect({
  className,
  size = 'sm',
  children,
  ...props
}: Omit<React.ComponentProps<'select'>, 'size'> & { size?: keyof typeof SIZES }) {
  return (
    <span className="relative inline-flex">
      <select
        className={cn(
          'appearance-none rounded-lg border border-input bg-card pr-8 pl-3 text-foreground transition-colors',
          SIZES[size].select,
          'hover:border-muted-foreground focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground', SIZES[size].chevron)}
        aria-hidden="true"
      />
    </span>
  )
}

export { NativeSelect }
