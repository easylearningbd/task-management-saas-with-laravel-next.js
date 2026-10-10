import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { StatHue } from '@/components/ui/stat-card'
import { cn } from '@/lib/cn'

/* A project-page card with an icon-tile heading (the details screenshots: "Project Description"
   with a doc icon in a soft blue tile, "Timeline" with a calendar tile, …): Card.md's surface,
   then a head row of a 32px `radius-lg` tile in a stat hue — StatCard's compact tile, the hue's
   `icon-bg` ground with its `icon` glyph at `icon-size` — and the `title-card` title, an
   optional action on the right; the body under it at `card-padding`. The hues are the stat set
   and carry no meaning (brand-book.md). */

const TILE: Record<StatHue, string> = {
  emerald: 'bg-stat-emerald-icon-bg text-stat-emerald-icon',
  blue: 'bg-stat-blue-icon-bg text-stat-blue-icon',
  violet: 'bg-stat-violet-icon-bg text-stat-violet-icon',
  indigo: 'bg-stat-indigo-icon-bg text-stat-indigo-icon',
  amber: 'bg-stat-amber-icon-bg text-stat-amber-icon',
}

export function SectionCard({
  icon: Icon,
  hue,
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  icon: LucideIcon
  hue: StatHue
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  const headingId = React.useId()
  return (
    <Card className={cn('flex flex-col', className)}>
      <section aria-labelledby={headingId} className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-card pb-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-lg', TILE[hue])}>
              <Icon className="size-icon" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <h2 id={headingId} className="truncate text-title-card">
              {title}
            </h2>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
        <div className={cn('flex-1 p-card', bodyClassName)}>{children}</div>
      </section>
    </Card>
  )
}
