'use client'

import * as React from 'react'
import { CircleCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/cn'

/* A file tile (Files tab row, Media Library grid). Not in the design system — composed from
   Card.md's parts: a square on `radius-lg` with a 1px `border`; an image fills it
   (`object-cover`), anything else is a `muted` tile carrying its type ("PDF", "DOCX") in
   `title-card` `muted-foreground`; the file name sits under it in `body-sm`, truncated, the
   full name as its title. An image that fails to load (also before hydration) falls back to the
   typed tile.
   Two modes:
   - `onSelect` — the whole tile is a button (the picker). `selected` marks it (aria-pressed,
     a `primary` ring and a CircleCheck badge on a `card` disc); `busy` shows a spinner on a `card` disc
     with `shadow-sm` (the segmented-control pill's elevation).
   - `actions` — icon buttons laid over the tile's top-right corner on a `card` chip, shown on
     hover or keyboard focus, and always on touch screens (no hover there). */

export function FileThumbnail({
  name,
  typeLabel,
  imageUrl,
  onSelect,
  selected = false,
  busy = false,
  selectedLabel,
  actions,
  className,
}: {
  name: string
  /** e.g. "PDF" */
  typeLabel: string
  /** Set for images (an authenticated URL works: cookies go with <img>). */
  imageUrl?: string | null
  onSelect?: () => void
  selected?: boolean
  busy?: boolean
  /** Read after the name when selected, e.g. "Attached". */
  selectedLabel?: string
  actions?: React.ReactNode
  className?: string
}) {
  const t = useTranslations('shared.files')
  const [failed, setFailed] = React.useState(false)
  const showImage = Boolean(imageUrl) && !failed

  const tile = (
    <span
      className={cn(
        'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border',
        showImage ? 'bg-card' : 'bg-muted',
        selected && 'border-primary ring-2 ring-primary',
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a private API file; next/image would proxy it without the session cookie
        <img
          src={imageUrl ?? undefined}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailed(true)}
          // An image that failed before hydration never fires onError for React: check on mount.
          ref={(node) => {
            if (node?.complete && node.naturalWidth === 0) setFailed(true)
          }}
        />
      ) : busy ? null : (
        <span aria-hidden="true" className="px-2 text-title-card text-muted-foreground">
          {typeLabel}
        </span>
      )}
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex rounded-full bg-card p-1.5 shadow-sm">
            <Spinner />
          </span>
        </span>
      ) : null}
      {selected ? (
        <span className="absolute top-1.5 right-1.5 inline-flex rounded-full bg-card text-primary">
          <CircleCheck className="size-icon-lg" aria-hidden="true" />
        </span>
      ) : null}
    </span>
  )

  const caption = (
    <span className="mt-2 block truncate text-body-sm" title={name}>
      {name}
    </span>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={busy}
        aria-pressed={selected}
        aria-label={selected && selectedLabel ? `${name}, ${selectedLabel}` : name}
        title={name}
        className={cn(
          'group block w-full rounded-lg text-left transition-colors focus-visible:shadow-focus focus-visible:outline-none',
          'hover:[&>span:first-child]:border-ring disabled:cursor-wait',
          className,
        )}
      >
        {tile}
        {caption}
      </button>
    )
  }

  return (
    <figure className={cn('group relative w-full', className)}>
      {tile}
      <figcaption>{caption}</figcaption>
      <span className="sr-only">{t('type', { type: typeLabel })}</span>
      {actions ? (
        <div
          className={cn(
            'absolute top-1.5 right-1.5 flex gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm transition-opacity',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          {actions}
        </div>
      ) : null}
    </figure>
  )
}
