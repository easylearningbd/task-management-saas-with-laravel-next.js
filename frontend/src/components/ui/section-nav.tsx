'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* Vertical in-page section navigation (the left column of the Profile Settings screenshot).
   Not in the design system — built from SidebarNav.md's item anatomy at control size:
   `control-height` (36px) rows on `radius-lg`, 12px side padding, a 16px lucide glyph 12px
   from a 14px/500 label, 12px between rows. The current section takes a `muted` ground;
   others take `accent` on hover. Links point at `#id`, so it works without JavaScript; the
   caller decides which item is current (e.g. scroll-spy) and may intercept navigation. */

export type SectionNavItem = { id: string; label: string; icon: LucideIcon }

export function SectionNav({
  items,
  activeId,
  label,
  onNavigate,
  className,
}: {
  items: SectionNavItem[]
  activeId: string
  /** Accessible name for the <nav>, e.g. "Profile sections". */
  label: string
  /** Called on click with the target id; call `event.preventDefault()` to handle scrolling yourself. */
  onNavigate?: (id: string, event: React.MouseEvent<HTMLAnchorElement>) => void
  className?: string
}) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? 'location' : undefined}
                onClick={(event) => onNavigate?.(item.id, event)}
                className={cn(
                  'flex h-control items-center gap-3 rounded-lg px-3 text-body font-medium text-foreground transition-colors',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                  active ? 'bg-muted' : 'hover:bg-accent',
                )}
              >
                <item.icon className="size-icon shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
