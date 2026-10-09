'use client'

import * as React from 'react'
import { Calendar, FileText, Hash, Palette, SquareCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DetailList } from '@/components/shared/detail-list'
import { DetailsModal } from '@/components/shared/details-modal'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/features/companies/format'
import { useTaskStage } from '@/features/task-stages/api'
import { TaskStageStatusBadge } from '@/features/task-stages/components/task-stage-card'
import type { TaskStage } from '@/features/task-stages/types'

/* The eye icon's read-only view — PAGE SPEC C and the Task Stage Details screenshot: the 672px
   DetailsModal (the Clients size decision) with the soft-green `SquareCheck` tile, a rule under
   the header and only the × to close. Body, top to bottom:
     Stage Name (SquareCheck) — the name, semibold
     a badge row: the status badge, then "Done Stage" (blue, as on the card) or "Regular Stage"
     Color (Palette) — a 20px `radius-sm` swatch and the hex  |  Order (Hash) — the number
     Description (FileText) — in a muted inset box (`muted` ground, `radius-lg`); a muted
       "No description" when there is none
     Created At (Calendar) — YYYY-MM-DD in the viewer's zone
   Opens instantly from the card, then refreshes from GET /task-stages/{id}. */
export function TaskStageDetailsModal({
  open,
  onOpenChange,
  stage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage: TaskStage | null
}) {
  const t = useTranslations('taskStages.details')
  const detail = useTaskStage(stage?.id ?? null, { enabled: open, initialData: stage ?? undefined })
  const shown = detail.data ?? stage
  const createdAt = shown ? formatDate(shown.created_at) : null

  return (
    <DetailsModal open={open} onOpenChange={onOpenChange} title={t('title')} icon={SquareCheck} size="md" divided footer={false}>
      {shown ? (
        <div className="flex flex-col gap-4.5">
          <div className="flex flex-col gap-3">
            <DetailList columns={1} items={[{ id: 'name', label: t('name'), icon: SquareCheck, value: <span className="font-semibold">{shown.name}</span> }]} />
            <div className="flex flex-wrap items-center gap-2" aria-label={t('badges')}>
              <TaskStageStatusBadge stage={shown} />
              {shown.is_done_stage ? (
                <Badge tone="info" size="sm" outlined>
                  {t('doneStage')}
                </Badge>
              ) : (
                <Badge tone="neutral" size="sm" outlined>
                  {t('regularStage')}
                </Badge>
              )}
            </div>
          </div>

          <DetailList
            items={[
              {
                id: 'color',
                label: t('color'),
                icon: Palette,
                value: (
                  <span className="inline-flex items-center gap-2">
                    {/* The colour itself is data (the stage's), not a design token. */}
                    <span aria-hidden="true" className="size-5 shrink-0 rounded-sm" style={{ backgroundColor: shown.color }} />
                    {shown.color.toUpperCase()}
                  </span>
                ),
              },
              { id: 'order', label: t('order'), icon: Hash, value: String(shown.order) },
            ]}
          />

          <DetailList
            columns={1}
            items={[
              {
                id: 'description',
                label: t('description'),
                icon: FileText,
                value: (
                  <span className="mt-0.5 block rounded-lg bg-muted px-3 py-2.5 whitespace-pre-line">
                    {shown.description ?? <span className="text-muted-foreground">{t('noDescription')}</span>}
                  </span>
                ),
              },
              {
                id: 'created_at',
                label: t('createdAt'),
                icon: Calendar,
                value: createdAt && shown.created_at ? <time dateTime={shown.created_at}>{createdAt}</time> : null,
              },
            ]}
          />
        </div>
      ) : null}
    </DetailsModal>
  )
}
