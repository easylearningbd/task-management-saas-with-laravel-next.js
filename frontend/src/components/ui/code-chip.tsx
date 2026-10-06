import * as React from 'react'
import { cn } from '@/lib/cn'

/* design-system/components/Badge.md — "a coupon code is a 28px `code` chip in `font-mono` at
   `code` size": the badge shape (`radius-md`, 10px side padding) on the `code` ground with
   `code-foreground` text. For machine strings (codes, keys) — not for status. */
function CodeChip({ className, ...props }: React.ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'inline-flex h-7 items-center rounded-md bg-code px-2.5 font-mono text-code whitespace-nowrap text-code-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { CodeChip }
