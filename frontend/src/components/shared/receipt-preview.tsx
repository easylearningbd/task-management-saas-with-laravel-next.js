'use client'

import * as React from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

/* A stored document (a payment receipt) shown in place, from an authorised URL — the session
   cookie goes with <img> and links, as with Media files. Not in the design system — composed from
   FileDropzone's preview card and Card.md's parts:
   - an image: the picture itself, contained and centred on a 256px `muted` well (`radius-lg`, 1px
     `border`) — any size reads the same, a tiny scan as well as a full-page photo — then the "Open receipt" link to see it full size;
   - anything else (a PDF) — or an image that fails to load — the file chip (a 64px `muted` tile
     with `FileText`, the file name) with the same link;
   - none: a muted line ("No receipt attached").
   The link opens a new tab and keeps the referrer (no `noreferrer`): Sanctum recognises the app by
   it to send the session. */

const IMAGE = /\.(png|jpe?g|gif|webp)$/i

export function ReceiptPreview({ url, name }: { url: string | null; name: string | null }) {
  const t = useTranslations('shared.receipt')
  // Remembered per URL: the review modal shows one order after another.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null)

  if (!url) return <p className="text-body text-muted-foreground">{t('none')}</p>

  const fileName = name ?? t('fallbackName')
  const isImage = IMAGE.test(fileName) && failedUrl !== url
  const link = (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      aria-label={t('openLabel', { name: fileName })}
      className="inline-flex items-center gap-1.5 rounded-sm text-body-sm font-medium text-primary-strong hover:underline focus-visible:shadow-focus focus-visible:outline-none"
    >
      {t('open')}
      <ExternalLink className="size-icon shrink-0" aria-hidden="true" />
    </a>
  )

  if (isImage) {
    return (
      <figure className="flex flex-col gap-2">
        <div className="flex h-64 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- an authenticated API file, not an optimisable asset */}
          <img src={url} alt={t('imageAlt', { name: fileName })} onError={() => setFailedUrl(url)} className="max-h-full max-w-full object-contain" />
        </div>
        <figcaption className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="min-w-0 truncate text-body-sm text-muted-foreground" title={fileName}>
            {fileName}
          </span>
          {link}
        </figcaption>
      </figure>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileText className="size-6.5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="block w-full truncate text-title-row" title={fileName}>
          {fileName}
        </span>
        {link}
      </span>
    </div>
  )
}
