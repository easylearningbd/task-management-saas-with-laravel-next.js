import { cn } from '@/lib/cn'

/* design-system/components/ProgressBar.md — a `progress-height` (6px) track on `radius-sm`
   in `track`, filled `primary` from the left. A 0% bar stays visible as an empty track.
   `tone`: "Fill stays `primary` — switch to `info` or `warning` only when the bar measures
   consumption against a limit and is nearing it." */
const FILLS = { primary: 'bg-primary', info: 'bg-info', warning: 'bg-warning' } as const

export function ProgressBar({
  value,
  label,
  tone = 'primary',
  className,
}: {
  value: number
  label: string
  tone?: keyof typeof FILLS
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('h-1.5 overflow-hidden rounded-sm bg-track', className)}>
      <div
        className={cn('h-full rounded-sm', FILLS[tone])}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      />
    </div>
  )
}
