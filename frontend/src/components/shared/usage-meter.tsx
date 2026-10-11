'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { ProgressBar, type ProgressTone } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* Usage against a plan allowance — storage in the Media Library, projects on the Projects page.
   Nothing here knows what is being counted: the caller passes the label and every formatted
   figure; the meter only places them and picks the state.

   The LabelledProgressBar row from ProgressBar.md: the label (and figure) above the bar.
   ProgressBar.md: "switch to `info` or `warning` only when the bar measures consumption against a
   limit and is nearing it" — and `danger` once it reaches it (Admin Plan Requests Phase 0
   decision 2). Levels (usageLevel):
     ok        under 80%            `primary` fill, the figure in `muted-foreground`
     near      80% to under 100%    `warning` fill and figure; `action` shown
     full      100% or more — or a 0 allowance — clamped at full; `danger`; `action` shown
     unlimited null limit           no bar: the figure and an `info` "Unlimited" badge
                                    (brand-book.md: the word, never ∞); no action
   Layout: without `remaining`, label left and figure right (the Media Library meter); with it,
   label and figure left, `remaining` right. `messages` adds a caption under the bar for the
   near / full levels; `action` (e.g. an Upgrade link) sits at the right of that caption row.
   A used count over the limit never overflows the bar; `remaining` is the caller's, from the
   server. */

export type UsageLevel = 'ok' | 'near' | 'full' | 'unlimited'

/** Where `used` stands against `limit` (null = unlimited). A 0 allowance is already full. */
export function usageLevel(used: number, limit: number | null): UsageLevel {
  if (limit === null) return 'unlimited'
  if (limit <= 0 || used >= limit) return 'full'
  return used / limit >= 0.8 ? 'near' : 'ok'
}

const TONE: Record<Exclude<UsageLevel, 'unlimited'>, ProgressTone> = { ok: 'primary', near: 'warning', full: 'danger' }
const FIGURE: Record<UsageLevel, string> = { ok: 'text-muted-foreground', near: 'text-warning', full: 'text-danger', unlimited: 'text-muted-foreground' }

export function UsageMeter({
  label,
  used,
  limit,
  usedLabel,
  limitLabel,
  figure,
  remaining,
  messages,
  action,
  loading = false,
  className,
}: {
  /** e.g. "Storage", "Projects used" */
  label: string
  used: number
  /** null = unlimited */
  limit: number | null
  usedLabel: string
  /** Ignored when unlimited. */
  limitLabel?: string
  /** Replaces the default "{used} of {limit}" text (unlimited: just `usedLabel`). */
  figure?: string
  /** Right-hand text, e.g. "2 remaining" — moves the figure next to the label. Hidden when unlimited. */
  remaining?: string
  /** A caption under the bar when nearing or at the limit. */
  messages?: { near?: React.ReactNode; full?: React.ReactNode }
  /** Shown with the caption when nearing or at the limit (e.g. an Upgrade link). */
  action?: React.ReactNode
  loading?: boolean
  className?: string
}) {
  const t = useTranslations('shared.usage')
  const level = usageLevel(used, limit)
  const pct = limit === null ? 0 : limit <= 0 ? 100 : Math.min(100, (used / limit) * 100)
  const text = figure ?? (limit === null ? usedLabel : t('of', { used: usedLabel, limit: limitLabel ?? '' }))
  const caption = level === 'near' ? messages?.near : level === 'full' ? messages?.full : null
  const showAction = (level === 'near' || level === 'full') && action

  const figureNode = loading ? (
    <Skeleton className="h-4 w-24" />
  ) : (
    <span className={cn('inline-flex items-center gap-2 text-body-sm', FIGURE[level])}>
      {text}
      {level === 'unlimited' ? <Badge tone="info">{t('unlimited')}</Badge> : null}
    </span>
  )

  return (
    <div className={className}>
      <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-1', level !== 'unlimited' && 'mb-2')}>
        {remaining === undefined ? (
          <>
            <span className="text-body-sm font-medium">{label}</span>
            {figureNode}
          </>
        ) : (
          <>
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-body-sm font-medium">{label}</span>
              {figureNode}
            </span>
            {level !== 'unlimited' && !loading ? <span className={cn('text-body-sm', FIGURE[level])}>{remaining}</span> : null}
          </>
        )}
      </div>
      {level === 'unlimited' ? null : <ProgressBar value={loading ? 0 : pct} label={`${label}: ${text}`} tone={TONE[level]} />}
      {!loading && (caption || showAction) ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {caption ? <p className={cn('text-body-sm', FIGURE[level])}>{caption}</p> : <span />}
          {showAction ? action : null}
        </div>
      ) : null}
    </div>
  )
}
