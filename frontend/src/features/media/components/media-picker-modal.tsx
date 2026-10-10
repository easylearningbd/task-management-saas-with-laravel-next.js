'use client'

import * as React from 'react'
import { Image as ImageIcon, Plus, SearchX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SEARCH_DEBOUNCE_MS } from '@/components/shared/filter-bar'
import { FileThumbnail } from '@/components/shared/file-thumbnail'
import { UploadProgress, type UploadItem } from '@/components/shared/upload-progress'
import { UsageMeter } from '@/components/shared/usage-meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { FileButton } from '@/components/ui/file-button'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { formatBytes } from '@/lib/format-bytes'
import { useMediaList, useUploadMedia } from '@/features/media/api'
import { MEDIA_ACCEPT, MEDIA_MAX_BYTES, MEDIA_PER_PAGE, type Media } from '@/features/media/types'
import { usePlanUsage } from '@/features/plan-usage/api'

/* The Media Library picker (Files tab screenshot), on the shared `lg` modal (872px — Phase 0
   decision 8; the screenshot is ~1000px):
   - header: the `Image` glyph in DetailsModal's 40px `primary-soft` tile, "Media Library" and
     a count badge (all the company's files);
   - a "Search media files..." SearchInput (300ms debounce, as FilterBar) and a primary
     "+ Upload" FileButton (several files at once);
   - the company's storage against its plan (UsageMeter) and each upload's progress;
   - "{n} files • Page {x} of {y}", then the tiles (FileThumbnail), 18 a page, newest first,
     with « Previous / Next » when there is more than one page;
   - a Cancel-only footer.
   Picking: a tile click calls `onPick` right away — there's no Save; the caller attaches,
   toasts and marks the tile (`attachedIds`, `pendingIds`) and the modal stays open, so several
   files can be attached in a row.
   Uploading: one request per file, in order, each with its own bar. Over 10 MB is refused
   here before sending; a refused type or the plan's storage limit (422
   `storage_limit_reached`) shows the server's own message on that file's row. A new upload
   lands first on page 1. Closing mid-upload is fine: the requests finish in the background.
   */

export function MediaPickerModal({
  open,
  onOpenChange,
  onPick,
  attachedIds,
  pendingIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A tile was clicked (not called for a tile already attached or being attached). */
  onPick: (media: Media) => void
  /** Media already on the project: marked, and not picked again. */
  attachedIds: ReadonlySet<number>
  /** Being attached right now: show a spinner. */
  pendingIds?: ReadonlySet<number>
}) {
  const t = useTranslations('media.picker')
  const tModal = useTranslations('shared.modal')
  const tPage = useTranslations('shared.pagination')
  const tFilters = useTranslations('shared.filters')

  const [draft, setDraft] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [uploads, setUploads] = React.useState<UploadItem[]>([])
  const uploadSeq = React.useRef(0)

  // Debounced search; a new search goes back to page 1.
  React.useEffect(() => {
    const next = draft.trim()
    if (next === search) return
    const timer = window.setTimeout(() => {
      setSearch(next)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, search])

  const list = useMediaList({ page, per_page: MEDIA_PER_PAGE, ...(search ? { search } : {}) }, { enabled: open })
  // The header badge counts the whole library, whatever the search.
  const all = useMediaList({ page: 1, per_page: 1 }, { enabled: open })
  const usage = usePlanUsage({ enabled: open })
  const upload = useUploadMedia()

  const meta = list.data?.meta
  const lastPage = Math.max(1, meta?.last_page ?? 1)
  const total = meta?.total ?? 0
  const items = list.data?.data ?? []

  // A page past the end (after deletions elsewhere) steps back — adjusted while rendering.
  if (meta && page > lastPage) setPage(lastPage)

  const patchUpload = (id: string, patch: Partial<UploadItem>) =>
    setUploads((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const startUploads = async (files: File[]) => {
    const queued = files.map((file) => {
      uploadSeq.current += 1
      const item: UploadItem = {
        id: `upload-${uploadSeq.current}`,
        name: file.name,
        sizeLabel: formatBytes(file.size),
        progress: 0,
        status: file.size > MEDIA_MAX_BYTES ? 'error' : 'uploading',
        error: file.size > MEDIA_MAX_BYTES ? t('tooLarge', { max: formatBytes(MEDIA_MAX_BYTES) }) : undefined,
      }
      return { file, item }
    })
    setUploads((current) => [...queued.map((q) => q.item), ...current])

    for (const { file, item } of queued) {
      if (item.status === 'error') continue
      try {
        await upload.mutateAsync({ file, onProgress: (progress) => patchUpload(item.id, { progress }) })
        patchUpload(item.id, { status: 'done', progress: 100 })
        setPage(1)
      } catch (error) {
        const apiError = toApiError(error)
        const message =
          apiError.fieldErrors.file ||
          (apiError.status === 413 ? t('tooLarge', { max: formatBytes(MEDIA_MAX_BYTES) }) : '') ||
          (apiError.status === 0 ? t('network') : apiError.message) ||
          t('failed')
        patchUpload(item.id, { status: 'error', error: message })
      }
    }
  }

  const onOpenChangeSafe = (next: boolean) => {
    if (!next) {
      // Finished rows are cleared on close; the search and page start over next time.
      setUploads((current) => current.filter((item) => item.status === 'uploading'))
      setDraft('')
      setSearch('')
      setPage(1)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeSafe}>
      <DialogContent
        size="lg"
        divided
        closeLabel={tModal('close')}
        heading={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-tile shrink-0 items-center justify-center rounded-tile bg-primary-soft text-primary-strong">
              <ImageIcon className="size-icon-lg" aria-hidden="true" />
            </span>
            {t('title')}
            {all.data ? (
              <Badge tone="primary" aria-label={t('countLabel', { count: all.data.meta.total })}>
                {all.data.meta.total}
              </Badge>
            ) : null}
          </span>
        }
      >
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              size="default"
              className="min-w-0 flex-1 basis-56"
              value={draft}
              onValueChange={setDraft}
              onClear={() => {
                setDraft('')
                setSearch('')
                setPage(1)
              }}
              clearLabel={tFilters('clearSearch')}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
            />
            <FileButton variant="primary" accept={MEDIA_ACCEPT.join(',')} multiple onSelectMany={(files) => void startUploads(files)}>
              <Plus className="size-icon" aria-hidden="true" />
              {t('upload')}
            </FileButton>
          </div>

          <UsageMeter
            label={t('storage')}
            loading={usage.isPending}
            used={usage.data?.storage.used_bytes ?? 0}
            limit={usage.data?.storage.limit_bytes ?? null}
            usedLabel={formatBytes(usage.data?.storage.used_bytes ?? 0)}
            limitLabel={formatBytes(usage.data?.storage.limit_bytes ?? 0)}
          />

          <UploadProgress
            items={uploads}
            onDismiss={(id) => setUploads((current) => current.filter((item) => item.id !== id))}
          />

          <div className="text-body-sm text-muted-foreground" aria-live="polite">
            {list.isPending ? <Skeleton className="inline-block h-4 w-32 align-middle" /> : t('summary', { count: total, page, pages: lastPage })}
          </div>

          {list.isError ? (
            <EmptyState icon={SearchX} tone="danger" title={t('loadFailed')} />
          ) : list.isPending ? (
            <TileGrid label={t('gridLabel')} busy>
              {Array.from({ length: 12 }, (_, index) => (
                <li key={index} aria-hidden="true">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="mt-2 h-3.5 w-3/4" />
                </li>
              ))}
            </TileGrid>
          ) : items.length === 0 ? (
            search ? (
              <EmptyState icon={SearchX} title={t('noResults')} description={t('noResultsHint')} />
            ) : (
              <EmptyState icon={ImageIcon} title={t('empty')} description={t('emptyHint')} />
            )
          ) : (
            <TileGrid label={t('gridLabel')} busy={list.isFetching}>
              {items.map((media) => {
                const attached = attachedIds.has(media.id)
                const pending = pendingIds?.has(media.id) ?? false
                return (
                  <li key={media.id}>
                    <FileThumbnail
                      name={media.original_name}
                      typeLabel={media.type_label}
                      imageUrl={media.is_image ? media.url : null}
                      selected={attached}
                      selectedLabel={t('attached')}
                      busy={pending}
                      onSelect={() => {
                        if (!attached && !pending) onPick(media)
                      }}
                    />
                  </li>
                )
              })}
            </TileGrid>
          )}

          {lastPage > 1 ? (
            <nav aria-label={tPage('label')} className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label={tPage('previousLabel')}>
                {tPage('previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} aria-label={tPage('nextLabel')}>
                {tPage('next')}
              </Button>
            </nav>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChangeSafe(false)}>
            {tModal('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TileGrid({ label, busy, children }: { label: string; busy: boolean; children: React.ReactNode }) {
  return (
    <ul aria-label={label} aria-busy={busy || undefined} className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {children}
    </ul>
  )
}
