import { cn } from '@/lib/cn'

/* design-system/components/ProgressBar.md — a `progress-height` (6px) track on `radius-sm`
   in `track`, filled `primary` from the left. A 0% bar stays visible as an empty track. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('h-1.5 overflow-hidden rounded-sm bg-track', className)}>
      <div
        className="h-full rounded-sm bg-primary"
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
