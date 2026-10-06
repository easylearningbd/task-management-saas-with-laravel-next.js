'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/* Tooltip — no component spec exists in the design system; approved in the Coupons Phase 0
   decisions to use the dropdown/popover panel tokens: `popover` ground, 1px `border`,
   `radius-lg`, `shadow-lg` (brand-book.md lists tooltips among the shadow-lg surfaces) and
   `body-sm` text. Shows on hover and on keyboard focus; Escape dismisses it.
   A tooltip only repeats a visible control's accessible name — always give the trigger its
   own `aria-label` too. */
function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 300,
}: {
  content: React.ReactNode
  /** A single focusable element (rendered with asChild). */
  children: React.ReactElement
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>['side']
  delayDuration?: number
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={4}
            className={cn(
              'z-50 rounded-lg border border-border bg-popover px-2 py-1 text-body-sm text-popover-foreground shadow-lg',
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip }
