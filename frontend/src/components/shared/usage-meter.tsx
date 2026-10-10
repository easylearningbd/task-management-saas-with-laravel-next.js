'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* Usage against a plan allowance (storage in the Media Library, projects later) — the
   LabelledProgressBar row from ProgressBar.md: label left, "{used} of {limit}" right, the bar
   under them. ProgressBar.md: "switch to `info` or `warning` only when the bar measures
   consumption against a limit and is nearing it" — so the fill is `primary`, `warning` from
   75% (ProgressRing.md's threshold). A null limit is "Unlimited" (brand-book.md: the word,
   never ∞) with an empty track. The caller formats both figures ("120 MB", "1 GB"). */
export function UsageMeter({
  label,
  used,
  limit,
  usedLabel,
  limitLabel,
  loading = false,
  className,
}: {
  /** e.g. "Storage" */
  label: string
  used: number
  /** null = unlimited */
  limit: number | null
  usedLabel: string
  /** Ignored when unlimited. */
  limitLabel?: string
  loading?: boolean
  className?: string
}) {
  const t = useTranslations('shared.usage')
  // A zero allowance with anything used is full, not empty.
  const pct = limit === null ? 0 : limit <= 0 ? (used > 0 ? 100 : 0) : Math.min(100, (used / limit) * 100)
  const figure = limit === null ? t('ofUnlimited', { used: usedLabel }) : t('of', { used: usedLabel, limit: limitLabel ?? '' })

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-body-sm font-medium">{label}</span>
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <span className={cn('text-body-sm', pct >= 75 ? 'text-warning' : 'text-muted-foreground')}>{figure}</span>
        )}
      </div>
      <ProgressBar value={loading ? 0 : pct} label={`${label}: ${figure}`} tone={pct >= 75 ? 'warning' : 'primary'} />
    </div>
  )
}
