import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/StatCard.md, as built in design/admin-dashboard/components/
   dashboard/stat-cards.tsx: a 164px tinted card, a 40px icon tile, two decorative circles
   of the tile color, then label · figure (24px/700) · note. The five hues are a fixed set
   in a fixed order and carry no meaning. The design adds a hairline border in the tile
   color and `shadow-xs` (StatCard.md says neither) — the design file wins. */

export type StatHue = 'emerald' | 'blue' | 'violet' | 'indigo' | 'amber'

const HUE: Record<StatHue, { card: string; tile: string; label: string; value: string }> = {
  emerald: {
    card: 'bg-stat-emerald text-stat-emerald-icon-bg border-stat-emerald-icon-bg',
    tile: 'bg-stat-emerald-icon-bg text-stat-emerald-icon',
    label: 'text-stat-emerald-label',
    value: 'text-stat-emerald-value',
  },
  blue: {
    card: 'bg-stat-blue text-stat-blue-icon-bg border-stat-blue-icon-bg',
    tile: 'bg-stat-blue-icon-bg text-stat-blue-icon',
    label: 'text-stat-blue-label',
    value: 'text-stat-blue-value',
  },
  violet: {
    card: 'bg-stat-violet text-stat-violet-icon-bg border-stat-violet-icon-bg',
    tile: 'bg-stat-violet-icon-bg text-stat-violet-icon',
    label: 'text-stat-violet-label',
    value: 'text-stat-violet-value',
  },
  indigo: {
    card: 'bg-stat-indigo text-stat-indigo-icon-bg border-stat-indigo-icon-bg',
    tile: 'bg-stat-indigo-icon-bg text-stat-indigo-icon',
    label: 'text-stat-indigo-label',
    value: 'text-stat-indigo-value',
  },
  amber: {
    card: 'bg-stat-amber text-stat-amber-icon-bg border-stat-amber-icon-bg',
    tile: 'bg-stat-amber-icon-bg text-stat-amber-icon',
    label: 'text-stat-amber-label',
    value: 'text-stat-amber-value',
  },
}

export function StatCard({
  hue,
  icon: Icon,
  label,
  value,
  caption,
  corner,
  className,
}: {
  hue: StatHue
  icon: LucideIcon
  label: string
  value: string
  caption: React.ReactNode
  /** Top-right extra: an arrow glyph, or the `warning` "Action needed" chip. */
  corner?: React.ReactNode
  className?: string
}) {
  const h = HUE[hue]

  return (
    <div className={cn('relative h-41 overflow-hidden rounded-xl border p-5 shadow-xs', h.card, className)}>
      {/* decorative circles take the tile color through `currentColor` */}
      <span aria-hidden="true" className="absolute -top-6.5 -right-6.5 size-23 rounded-full bg-current opacity-55" />
      <span aria-hidden="true" className="absolute right-6.5 -bottom-4.5 size-11 rounded-full bg-current opacity-45" />
      <span className={cn('relative inline-flex size-tile items-center justify-center rounded-tile', h.tile)}>
        <Icon className="size-icon-lg" strokeWidth={1.75} aria-hidden="true" />
      </span>
      {corner}
      <p className={cn('relative mt-4 text-caption', h.label)}>{label}</p>
      <p className={cn('relative mt-1 text-2xl leading-8 font-bold tracking-[-0.01em]', h.value)}>{value}</p>
      <p className={cn('relative mt-0.5 flex items-center gap-1 text-caption opacity-85', h.label)}>{caption}</p>
    </div>
  )
}
