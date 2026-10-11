'use client'

import * as React from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format-bytes'
import { cn } from '@/lib/cn'

/* One file, picked by drag-and-drop or by click (the checkout's payment receipt). Not in the design
   system — built from its parts: an Input.md-like well (`card`, a 2px dashed `border` on
   `radius-xl`) holding EmptyState.md's 56px `muted` circle with an `Upload` glyph, the prompt
   (`body`, the "browse" part in `primary`) and the caller's hint (`body-sm` muted). Dragging a
   file over it turns the frame `primary` on `primary-soft`.
   The whole well is one button (Tab, then Enter / Space opens the file dialog), so the caller's
   <Label htmlFor={id}> names it; a problem is announced through its aria-describedby message
   (an alert) and the well's `destructive` frame. The file is checked HERE before anything uploads: its type
   against `accept` (by content type, or by extension when the browser gives none) and its size
   against `maxBytes` — a refused file shows why under the well and is never handed over.
   Once chosen, the well becomes a preview card: an image is shown (a local object URL, revoked
   when it changes), anything else a file chip (`FileText`, the name, the size) — with a ghost
   "Remove" (X) that clears it and puts focus back on the well. `error` (e.g. the server's 422) is
   shown the same way; a local refusal of the file just picked takes its place until a file is
   accepted. */

export type DropzoneAccept = Record<string, ReadonlyArray<string>> // content type → extensions

export function FileDropzone({
  id,
  value,
  onChange,
  accept,
  maxBytes,
  hint,
  error,
  disabled = false,
  invalid = false,
  describedBy,
  className,
}: {
  id?: string
  value: File | null
  onChange: (file: File | null) => void
  /** e.g. { 'image/png': ['png'], 'application/pdf': ['pdf'] } */
  accept: DropzoneAccept
  maxBytes: number
  /** "JPG, PNG or PDF, up to 5 MB" */
  hint: string
  /** A message from outside (validation, the server); a refusal of the file just picked shows instead. */
  error?: string
  disabled?: boolean
  /** Mark the well invalid (e.g. the form's own "required" error). */
  invalid?: boolean
  /** Extra ids for aria-describedby (the caller's hint / error). */
  describedBy?: string
  className?: string
}) {
  const t = useTranslations('shared.dropzone')
  const generatedId = React.useId()
  const buttonId = id ?? generatedId
  const messageId = `${buttonId}-message`
  const inputRef = React.useRef<HTMLInputElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const acceptAttr = React.useMemo(
    () => [...Object.keys(accept), ...Object.values(accept).flat().map((ext) => `.${ext}`)].join(','),
    [accept],
  )

  const check = (file: File): string | null => {
    const extension = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : ''
    const typeOk = file.type !== '' ? file.type in accept : Object.values(accept).some((list) => list.includes(extension))
    const extensionOk = Object.values(accept).some((list) => list.includes(extension))
    if (!typeOk || !extensionOk) return t('badType')
    if (file.size > maxBytes) return t('tooLarge', { max: formatBytes(maxBytes) })
    return null
  }

  const take = (file: File | undefined) => {
    if (!file || disabled) return
    const problem = check(file)
    setLocalError(problem)
    if (problem === null) onChange(file)
  }

  const remove = () => {
    onChange(null)
    setLocalError(null)
    // The well comes back on the next render; focus it there.
    window.setTimeout(() => buttonRef.current?.focus(), 0)
  }

  // The local refusal is about the file just picked, so it wins over an older outside message
  // ("Attach the payment receipt."); picking an accepted file clears it and the outside one returns.
  const message = localError ?? error
  const describedByIds = [message ? messageId : null, describedBy ?? null].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(event) => {
          take(event.target.files?.[0])
          event.target.value = '' // picking the same file again still fires
        }}
      />

      {value ? (
        <FilePreview file={value} onRemove={remove} removeLabel={t('remove', { name: value.name })} disabled={disabled} />
      ) : (
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          aria-describedby={describedByIds}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            take(event.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-card px-6 py-8 text-center transition-colors',
            'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-disabled',
            dragging ? 'border-primary bg-primary-soft' : message || invalid ? 'border-destructive' : 'border-border hover:bg-accent',
          )}
        >
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Upload className="size-6.5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="text-body">
            {t.rich('prompt', { browse: (chunks) => <span className="font-medium text-primary">{chunks}</span> })}
          </span>
          <span className="text-body-sm text-muted-foreground">{hint}</span>
        </button>
      )}

      {message ? (
        <p id={messageId} role="alert" className="mt-1.5 text-body-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  )
}

/** The chosen file: an image preview, or a file chip; name, size and Remove. */
function FilePreview({ file, onRemove, removeLabel, disabled }: { file: File; onRemove: () => void; removeLabel: string; disabled: boolean }) {
  const isImage = file.type.startsWith('image/')
  // A local object URL for the preview, revoked when the file changes or the card goes.
  const url = React.useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage])
  React.useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
        <img src={url} alt="" className="size-16 shrink-0 rounded-lg border border-border object-cover" />
      ) : (
        <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileText className="size-6.5" strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-title-row" title={file.name}>
          {file.name}
        </span>
        <span className="block text-body-sm text-muted-foreground">{formatBytes(file.size)}</span>
      </span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove} disabled={disabled} className="hover:bg-danger-soft hover:text-danger">
        <X className="size-icon" aria-hidden="true" />
      </Button>
    </div>
  )
}
