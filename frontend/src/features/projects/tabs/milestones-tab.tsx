'use client'

import * as React from 'react'
import { Calendar, SquarePen, Target, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RowActions } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { useMilestones, useMilestoneWrites } from '@/features/projects/api'
import { MilestoneFormModal } from '@/features/projects/components/milestone-form-modal'
import { TabCard } from '@/features/projects/components/tab-card'
import type { Milestone, MilestoneStatus } from '@/features/projects/types'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Milestones tab (PAGE SPEC C): a card titled "Milestones" with a green "+ Add Milestone";
   the milestones in plan order (due date, then creation), each a row under a 1px rule:
   title (`title-row`) with its status badge (Pending `warning`, In Progress `info`, Completed
   `success` — Badge.md) and an "Overdue" `danger` badge when past due and not completed; the
   description (muted); the due date (and start date, if one was set) behind a Calendar glyph
   in `muted-foreground-alt`; the progress bar with its %; edit + delete icons on the right.
   The card, its Add button and the loading / error / empty states are the shared TabCard.
   Every change refreshes the tab count, the Milestones summary card and the Overview (the
   project's cache). */

const STATUS_TONE = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
} as const satisfies Record<MilestoneStatus, React.ComponentProps<typeof Badge>['tone']>

type FormState = { key: number; open: boolean; milestone: Milestone | null }

export function MilestonesTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.milestones')
  const milestones = useMilestones(project.id)
  const { remove } = useMilestoneWrites(project.id)
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, milestone: null })
  const [deleting, setDeleting] = React.useState<Milestone | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const openCreate = () => setForm((f) => ({ key: f.key + 1, open: true, milestone: null }))

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(t('delete.deleted'))
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  const list = milestones.data ?? []

  return (
    <>
      <TabCard
        title={t('title')}
        addLabel={t('add')}
        onAdd={openCreate}
        query={milestones}
        isEmpty={list.length === 0}
        empty={{ icon: Target, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<MilestonesSkeleton />}
      >
        <ul aria-label={t('title')} className="divide-y divide-border">
          {list.map((milestone) => (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              onEdit={() => setForm((f) => ({ key: f.key + 1, open: true, milestone }))}
              onDelete={() => {
                setDeleteError(null)
                setDeleting(milestone)
              }}
            />
          ))}
        </ul>
      </TabCard>

      <MilestoneFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        projectId={project.id}
        milestone={form.milestone}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { title: deleting.title }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('delete.cancel')}
        closeLabel={t('delete.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </>
  )
}

function MilestoneRow({ milestone, onEdit, onDelete }: { milestone: Milestone; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations('projects.milestones')
  const tStatus = useTranslations('projects.milestones.status')

  return (
    <li className="flex flex-col gap-3 px-card py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-title-row break-words">{milestone.title}</h3>
          <Badge tone={STATUS_TONE[milestone.status]} outlined>
            {tStatus(milestone.status)}
          </Badge>
          {milestone.is_overdue ? (
            <Badge tone="danger" outlined>
              {t('overdue')}
            </Badge>
          ) : null}
        </div>
        {milestone.description ? <p className="mt-1 text-body-sm text-muted-foreground break-words">{milestone.description}</p> : null}
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground-alt tabular-nums">
          {milestone.start_date ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
              {t('starts', { date: milestone.start_date })}
            </span>
          ) : null}
          {milestone.due_date ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
              {t('due', { date: milestone.due_date })}
            </span>
          ) : null}
        </p>
        <div className="mt-3 flex max-w-md items-center gap-2.5">
          <ProgressBar className="flex-1" value={milestone.progress} label={t('progressLabel', { title: milestone.title })} />
          <span className="w-10 text-right text-body-sm text-muted-foreground tabular-nums">{t('percent', { value: milestone.progress })}</span>
        </div>
      </div>
      <RowActions
        className="self-end sm:self-start"
        actions={[
          { id: 'edit', label: t('actions.edit', { title: milestone.title }), tooltip: t('actions.editTip'), icon: SquarePen, onClick: onEdit },
          { id: 'delete', label: t('actions.delete', { title: milestone.title }), tooltip: t('actions.deleteTip'), icon: Trash2, tone: 'danger', onClick: onDelete },
        ]}
      />
    </li>
  )
}

function MilestonesSkeleton() {
  return (
    <ul aria-hidden="true" className="divide-y divide-border">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex gap-3 px-card py-4">
          <div className="flex-1 space-y-2.5">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-1.5 w-full max-w-md" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="size-control-sm rounded-lg" />
            <Skeleton className="size-control-sm rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  )
}
