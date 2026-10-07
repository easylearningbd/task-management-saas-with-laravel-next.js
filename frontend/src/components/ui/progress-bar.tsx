import { cn } from '@/lib/cn'

/* design-system/components/ProgressBar.md — a `progress-height` (6px) track on `radius-sm`
   in `track`, filled `primary` from the left. A 0% bar stays visible as an empty track.
   `tone`: "Fill stays `primary` — switch to `info` or `warning` only when the bar measures
   consumption against a limit and is nearing it."
   Stat hues (blue / emerald / violet / indigo / amber): design/user-dashboard's Performance
   Overview colours each metric's bar to match its icon tile — the track in the hue's
   `icon-bg`, the fill in its `icon` colour. */
const TONES = {
  primary: { track: 'bg-track', fill: 'bg-primary' },
  info: { track: 'bg-track', fill: 'bg-info' },
  warning: { track: 'bg-track', fill: 'bg-warning' },
  blue: { track: 'bg-stat-blue-icon-bg', fill: 'bg-stat-blue-icon' },
  emerald: { track: 'bg-stat-emerald-icon-bg', fill: 'bg-stat-emerald-icon' },
  violet: { track: 'bg-stat-violet-icon-bg', fill: 'bg-stat-violet-icon' },
  indigo: { track: 'bg-stat-indigo-icon-bg', fill: 'bg-stat-indigo-icon' },
  amber: { track: 'bg-stat-amber-icon-bg', fill: 'bg-stat-amber-icon' },
} as const

export type ProgressTone = keyof typeof TONES

export function ProgressBar({
  value,
  label,
  tone = 'primary',
  className,
}: {
  value: number
  label: string
  tone?: ProgressTone
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('h-1.5 overflow-hidden rounded-sm', TONES[tone].track, className)}>
      <div
        className={cn('h-full rounded-sm', TONES[tone].fill)}
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
