'use client'

import * as React from 'react'
import { Download, Image as ImageIcon, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FileThumbnail } from '@/components/shared/file-thumbnail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { toApiError } from '@/lib/api-error'
import { MediaPickerModal } from '@/features/media/components/media-picker-modal'
import type { Media } from '@/features/media/types'
import { TabCard } from '@/features/projects/components/tab-card'

/* Media-library files attached to a record — the card of the project Files tab (its
   screenshot), shared by every "Files" tab (project, task) so there is one picker flow:
   a card titled `title` with a small Upload glyph beside it and a green square "+" icon button
   on the right (no text; "Add files" is its accessible name and tooltip). Below: a wrapping row
   of FileThumbnail tiles — image previews for images, a typed tile ("PDF", "DOCX") for the rest,
   the file name under each — with Download (the authenticated file route, as an attachment)
   and Detach on hover or keyboard focus. Detach removes the link only; the file stays in the
   media library.
   The "+" opens the Media Library picker (upload, search, count badge, plan storage limit): a
   tile click attaches that file at once with a toast ("File attached", or "Already attached" —
   the API is idempotent), marks the tile, and the picker stays open for more; Cancel closes it.
   The caller owns the data: `files` (its list query), `attach` and `detach` (its mutations,
   which refresh its counts). */

export type AttachedFile = { id: number; media: Media }

type FilesQuery = {
  data: ReadonlyArray<AttachedFile> | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

export function AttachedFilesCard({
  title,
  detachLabel,
  files,
  attach,
  detach,
}: {
  title: string
  /** The Detach button's accessible name for a file ("Detach report.pdf from this project"). */
  detachLabel: (name: string) => string
  files: FilesQuery
  /** Attach a media id; `created` is false when it was already attached. */
  attach: (mediaId: number) => Promise<{ created: boolean }>
  /** Detach by the link's id. */
  detach: (fileId: number) => Promise<unknown>
}) {
  const t = useTranslations('shared.attachedFiles')
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [pending, setPending] = React.useState<ReadonlySet<number>>(new Set())
  const [detaching, setDetaching] = React.useState<number | null>(null)

  const list = React.useMemo(() => files.data ?? [], [files.data])
  const attachedIds = React.useMemo(() => new Set(list.map((file) => file.media.id)), [list])

  const onPick = (media: Media) => {
    setPending((current) => new Set(current).add(media.id))
    attach(media.id)
      .then(({ created }) => toast.success(created ? t('attached', { name: media.original_name }) : t('alreadyAttached', { name: media.original_name })))
      .catch((error: unknown) => toast.error(t('attachFailed'), toApiError(error).message))
      .finally(() =>
        setPending((current) => {
          const next = new Set(current)
          next.delete(media.id)
          return next
        }),
      )
  }

  const onDetach = (file: AttachedFile) => {
    setDetaching(file.id)
    detach(file.id)
      .then(() => toast.success(t('detached', { name: file.media.original_name })))
      .catch((error: unknown) => toast.error(t('detachFailed'), toApiError(error).message))
      .finally(() => setDetaching(null))
  }

  return (
    <>
      <TabCard
        title={title}
        titleIcon={Upload}
        addLabel={t('add')}
        addIconOnly
        onAdd={() => setPickerOpen(true)}
        query={files}
        isEmpty={list.length === 0}
        empty={{ icon: ImageIcon, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<FilesSkeleton />}
      >
        <ul aria-label={title} className="flex flex-wrap gap-4 p-card">
          {list.map((file) => (
            <li key={file.id} className="w-32">
              <FileThumbnail
                name={file.media.original_name}
                typeLabel={file.media.type_label}
                imageUrl={file.media.is_image ? file.media.url : null}
                busy={detaching === file.id}
                actions={
                  <>
                    <Tooltip content={t('download')}>
                      <Button asChild variant="ghost" size="icon-sm">
                        <a href={file.media.download_url} aria-label={t('downloadLabel', { name: file.media.original_name })}>
                          <Download className="size-icon" aria-hidden="true" />
                        </a>
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('detach')}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={detachLabel(file.media.original_name)}
                        disabled={detaching === file.id}
                        onClick={() => onDetach(file)}
                        className="hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="size-icon" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </TabCard>

      <MediaPickerModal open={pickerOpen} onOpenChange={setPickerOpen} onPick={onPick} attachedIds={attachedIds} pendingIds={pending} />
    </>
  )
}

function FilesSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-wrap gap-4 p-card">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="w-32">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="mt-2 h-3.5 w-3/4" />
        </li>
      ))}
    </ul>
  )
}
