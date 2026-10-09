import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/StatCard.md, as built in design/admin-dashboard/components/
   dashboard/stat-cards.tsx: a 164px tinted card, a 40px icon tile, two decorative circles
   of the tile color, then label · figure (24px/700) · note. The five hues are a fixed set
   in a fixed order and carry no meaning. The design adds a hairline border in the tile
   color and `shadow-xs` (StatCard.md says neither) — the design file wins.
   `compact`: the 123px variant of design/user-dashboard (hero-and-stats.tsx) — 16px padding,
   a 32px tile with a 16px glyph, smaller circles, a 20px/700 figure.
   `variant="corner"`: the white summary card of the Task Stages screenshot — `card` ground,
   1px `border`, `radius-xl`, `shadow-xs`, 20px padding; a `body` muted label over the 24px/700
   figure in `foreground`; the 20px icon in the hue's `icon` colour, inside a quarter-circle of
   the hue's `icon-bg` (a 160px circle centred on the card's top-right corner), as measured.
   The figure may be a word (a stage name): it truncates before the corner. */

/** The corner variant's quarter-circle and glyph, per hue. */
const CORNER: Record<StatHue, { circle: string; icon: string }> = {
  emerald: { circle: 'bg-stat-emerald-icon-bg', icon: 'text-stat-emerald-icon' },
  blue: { circle: 'bg-stat-blue-icon-bg', icon: 'text-stat-blue-icon' },
  violet: { circle: 'bg-stat-violet-icon-bg', icon: 'text-stat-violet-icon' },
  indigo: { circle: 'bg-stat-indigo-icon-bg', icon: 'text-stat-indigo-icon' },
  amber: { circle: 'bg-stat-amber-icon-bg', icon: 'text-stat-amber-icon' },
}

export type StatHue = 'emerald' | 'blue' | 'violet' | 'indigo' | 'amber'

const SIZES = {
  default: {
    card: 'h-41 p-5',
    big: '-top-6.5 -right-6.5 size-23',
    small: 'right-6.5 -bottom-4.5 size-11',
    tile: 'size-tile rounded-tile',
    glyph: 'size-icon-lg',
    label: 'mt-4',
    value: 'mt-1 text-2xl leading-8',
  },
  compact: {
    card: 'h-[123px] p-4',
    big: '-top-5 -right-5 size-19',
    small: 'right-5 -bottom-3.5 size-9',
    tile: 'size-8 rounded-lg',
    glyph: 'size-icon',
    label: 'mt-2.5',
    value: 'text-xl leading-7',
  },
} as const

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
  size = 'default',
  variant = 'tinted',
  className,
}: {
  hue: StatHue
  icon: LucideIcon
  label: string
  value: string
  /** The note under the figure (tinted cards; optional on `corner`). */
  caption?: React.ReactNode
  /** Top-right extra: an arrow glyph, or the `warning` "Action needed" chip. */
  corner?: React.ReactNode
  size?: keyof typeof SIZES
  /** `tinted` (the dashboards) or `corner` (a white card, the icon in a quarter-circle). */
  variant?: 'tinted' | 'corner'
  className?: string
}) {
  const h = HUE[hue]
  const z = SIZES[size]

  if (variant === 'corner') {
    const c = CORNER[hue]
    return (
      <div className={cn('relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs', className)}>
        <span aria-hidden="true" className={cn('absolute -top-20 -right-20 size-40 rounded-full', c.circle)} />
        <Icon className={cn('absolute top-7.5 right-7.5 size-icon-lg', c.icon)} strokeWidth={1.75} aria-hidden="true" />
        <div className="relative min-w-0 pr-20">
          <p className="text-body text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl leading-8 font-bold tracking-[-0.01em] text-foreground" title={value}>
            {value}
          </p>
          {caption ? <p className="mt-0.5 text-caption text-muted-foreground">{caption}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border shadow-xs', z.card, h.card, className)}>
      {/* decorative circles take the tile color through `currentColor` */}
      <span aria-hidden="true" className={cn('absolute rounded-full bg-current opacity-55', z.big)} />
      <span aria-hidden="true" className={cn('absolute rounded-full bg-current opacity-45', z.small)} />
      <span className={cn('relative inline-flex items-center justify-center', z.tile, h.tile)}>
        <Icon className={z.glyph} strokeWidth={1.75} aria-hidden="true" />
      </span>
      {corner}
      <p className={cn('relative text-caption', z.label, h.label)}>{label}</p>
      <p className={cn('relative font-bold tracking-[-0.01em]', z.value, h.value)}>{value}</p>
      <p className={cn('relative mt-0.5 flex items-center gap-1 text-caption opacity-85', h.label)}>{caption}</p>
    </div>
  )
}
