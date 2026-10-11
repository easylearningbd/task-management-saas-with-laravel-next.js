'use client'

import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* A Badge whose text may be too long for its place (a milestone name on a task card): it never
   grows past `className`'s max width (default: its container), the text ends in an ellipsis
   ("Phase 1: Lau…"), and only then the full text appears in the shared Tooltip — on hover, and
   on keyboard focus, as the cut badge becomes focusable. A badge that fits is a plain Badge.
   Assistive tech always gets the whole text (the ellipsis is CSS only). */
export function TruncatedBadge({
  children,
  tone,
  size,
  outlined,
  className,
}: {
  children: string
  className?: string
} & VariantProps<typeof badgeVariants>) {
  const [truncated, setTruncated] = React.useState(false)
  const observer = React.useRef<ResizeObserver | null>(null)

  // Re-measured whenever the text's box changes (a resized column, a new name).
  const measure = React.useCallback((element: HTMLSpanElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!element) return
    const check = () => setTruncated(element.scrollWidth > element.clientWidth)
    check()
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(check)
      observer.current.observe(element)
    }
  }, [])

  return (
    <Tooltip content={children} disabled={!truncated}>
      <Badge
        tone={tone}
        size={size}
        outlined={outlined}
        tabIndex={truncated ? 0 : undefined}
        className={cn('max-w-full min-w-0 focus-visible:shadow-focus focus-visible:outline-none', className)}
      >
        <span ref={measure} className="truncate">
          {children}
        </span>
      </Badge>
    </Tooltip>
  )
}
