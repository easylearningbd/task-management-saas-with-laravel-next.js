'use client'

import * as React from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { cn } from '@/lib/cn'

/* Per-file upload progress. Not in the design system — a list of ProgressBar.md rows on the
   `border` hairline of Card.md, `radius-lg`: the file name (truncated, `body`/500) and size
   (`body-sm` muted) over the bar; while sending, the percentage sits right; when done a
   `success` check; on failure a `danger` alert glyph and the server's message in `danger`
   under the name. A finished or failed row can be dismissed (ghost X, `icon-sm`).
   The list is a polite live region, so "Uploaded" / the error is announced. */

export type UploadItem = {
  id: string
  name: string
  /** Already formatted, e.g. "1.5 MB". */
  sizeLabel: string
  /** 0–100 */
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

export function UploadProgress({
  items,
  onDismiss,
  className,
}: {
  items: ReadonlyArray<UploadItem>
  onDismiss?: (id: string) => void
  className?: string
}) {
  const t = useTranslations('shared.upload')
  if (items.length === 0) return null

  return (
    <ul aria-live="polite" aria-label={t('label')} className={cn('flex flex-col gap-2', className)}>
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 truncate text-body font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="shrink-0 text-body-sm text-muted-foreground">{item.sizeLabel}</span>
              </div>
              {item.status === 'error' ? (
                <p className="mt-0.5 text-body-sm text-danger">{item.error ?? t('failed')}</p>
              ) : null}
            </div>
            {item.status === 'uploading' ? (
              <span className="shrink-0 text-body-sm text-muted-foreground">{t('percent', { value: Math.round(item.progress) })}</span>
            ) : item.status === 'done' ? (
              <CircleCheck className="size-icon shrink-0 text-success" aria-label={t('done')} />
            ) : (
              <CircleAlert className="size-icon shrink-0 text-danger" aria-label={t('failed')} />
            )}
            {item.status !== 'uploading' && onDismiss ? (
              <Button variant="ghost" size="icon-sm" aria-label={t('dismiss', { name: item.name })} onClick={() => onDismiss(item.id)}>
                <X className="size-icon" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          {item.status === 'uploading' ? (
            <ProgressBar className="mt-2" value={item.progress} label={t('progressLabel', { name: item.name })} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
