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
import { useAttachProjectFile, useDetachProjectFile, useProjectFiles } from '@/features/projects/api'
import { TabCard } from '@/features/projects/components/tab-card'
import type { ProjectFile } from '@/features/projects/types'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Files tab (PAGE SPEC C and the Files screenshot): a card titled "Project Files" with a
   small Upload glyph beside the title and a green square "+" icon button on the right (no text;
   "Add files" is its accessible name and tooltip). Below: a wrapping row of FileThumbnail
   tiles — image previews for images, a typed tile ("PDF", "DOCX") for the rest, the file name
   under each — with Download (the authenticated file route, as an attachment) and Detach on
   hover or keyboard focus. Detach removes the link only; the file stays in the media library.
   The "+" opens the Media Library picker: a tile click attaches that file at once with a toast
   ("File attached", or "Already attached" — the API is idempotent), marks the tile, and the
   picker stays open for more; Cancel closes it. Every change refreshes the tab count. */

export function FilesTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.files')
  const files = useProjectFiles(project.id)
  const attach = useAttachProjectFile(project.id)
  const detach = useDetachProjectFile(project.id)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [pending, setPending] = React.useState<ReadonlySet<number>>(new Set())
  const [detaching, setDetaching] = React.useState<number | null>(null)

  const list = React.useMemo(() => files.data ?? [], [files.data])
  const attachedIds = React.useMemo(() => new Set(list.map((file) => file.media.id)), [list])

  const onPick = (media: Media) => {
    setPending((current) => new Set(current).add(media.id))
    attach.mutate(media.id, {
      onSuccess: ({ created }) => toast.success(created ? t('attached', { name: media.original_name }) : t('alreadyAttached', { name: media.original_name })),
      onError: (error) => toast.error(t('attachFailed'), toApiError(error).message),
      onSettled: () =>
        setPending((current) => {
          const next = new Set(current)
          next.delete(media.id)
          return next
        }),
    })
  }

  const onDetach = (file: ProjectFile) => {
    setDetaching(file.id)
    detach.mutate(file.id, {
      onSuccess: () => toast.success(t('detached', { name: file.media.original_name })),
      onError: (error) => toast.error(t('detachFailed'), toApiError(error).message),
      onSettled: () => setDetaching(null),
    })
  }

  return (
    <>
      <TabCard
        title={t('title')}
        titleIcon={Upload}
        addLabel={t('add')}
        addIconOnly
        onAdd={() => setPickerOpen(true)}
        query={files}
        isEmpty={list.length === 0}
        empty={{ icon: ImageIcon, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<FilesSkeleton />}
      >
        <ul aria-label={t('title')} className="flex flex-wrap gap-4 p-card">
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
                        aria-label={t('detachLabel', { name: file.media.original_name })}
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
