import * as React from 'react'
import { ProgressBar, type ProgressTone } from '@/components/ui/progress-bar'
import { cn } from '@/lib/cn'

/* design-system/components/ProgressBar.md's full row: a 14px/500 name above left, its figure
   above right (8px over the bar), the bar, and an optional `body-sm` `muted-foreground` caption
   under it. The figure defaults to the rounded percentage ("73%"); pass `figure` for anything
   else (`text-money` for an amount). The bar's accessible name is the row's label. */
export function LabelledProgressBar({
  label,
  value,
  figure,
  money = false,
  caption,
  tone,
  className,
}: {
  label: string
  /** 0–100 */
  value: number
  /** Right-hand text; defaults to "{value}%". */
  figure?: string
  /** Set the figure in `text-money` (font-mono). */
  money?: boolean
  caption?: React.ReactNode
  tone?: ProgressTone
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body font-medium" title={label}>
          {label}
        </span>
        <span className={cn('shrink-0', money ? 'font-mono text-money' : 'text-body font-medium')}>{figure ?? `${Math.round(pct)}%`}</span>
      </div>
      <ProgressBar value={pct} label={label} tone={tone} />
      {caption ? <p className="mt-1.5 text-body-sm text-muted-foreground">{caption}</p> : null}
    </div>
  )
}
