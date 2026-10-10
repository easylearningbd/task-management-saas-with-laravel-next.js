import * as React from 'react'
import { isHexColor } from '@/lib/hex-color'
import { cn } from '@/lib/cn'

/* A badge tinted with a record's own colour (an expense category's `color`) — Badge.md's pill
   (24px, `radius-md`, 10px side padding, `badge` text) with the approved `outlined` hairline,
   coloured by CSS color-mix (Phase 0 decision 6):
     ground  — the colour at 12% over transparent
     hairline — the colour at 30%
     text    — the colour mixed 60/40 with the theme's `foreground`, so it stays readable in
               light and dark mode whatever the colour is.
   The colour is data, validated as `#RRGGBB` before it reaches CSS; anything else falls back to
   the `neutral` badge. Long names truncate (full name in the title). */
export function TintBadge({ color, children, className }: { color: string; children: string; className?: string }) {
  const valid = isHexColor(color)
  const hex = color.trim()

  return (
    <span
      title={children}
      className={cn(
        'inline-flex h-6 max-w-full items-center rounded-md border px-2.5 text-badge whitespace-nowrap',
        !valid && 'border-neutral/20 bg-neutral-soft text-neutral',
        className,
      )}
      style={
        valid
          ? {
              backgroundColor: `color-mix(in srgb, ${hex} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${hex} 30%, transparent)`,
              color: `color-mix(in srgb, ${hex} 60%, var(--foreground))`,
            }
          : undefined
      }
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
