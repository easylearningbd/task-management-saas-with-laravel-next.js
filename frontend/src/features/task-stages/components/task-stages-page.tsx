'use client'

import * as React from 'react'
import { CircleAlert, Inbox, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { FilterBar } from '@/components/shared/filter-bar'
import { SortableList } from '@/components/shared/sortable-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { useDeleteTaskStage, useReorderTaskStages, useTaskStages, useToggleTaskStageStatus } from '@/features/task-stages/api'
import { useTaskStageActions } from '@/features/task-stages/components/task-stage-actions'
import { TaskStageCard, TaskStageCardSkeleton } from '@/features/task-stages/components/task-stage-card'
import { TaskStageDetailsModal } from '@/features/task-stages/components/task-stage-details-modal'
import { TaskStageCreatedFilter, TaskStageStatusFilter } from '@/features/task-stages/components/task-stage-filters'
import { TaskStageFormModal } from '@/features/task-stages/components/task-stage-form-modal'
import { TaskStageStats } from '@/features/task-stages/components/task-stage-stats'
import type { TaskStage } from '@/features/task-stages/types'
import { useTaskStageListParams } from '@/features/task-stages/use-task-stage-list-params'
import { toApiError } from '@/lib/api-error'

/* /configuration/task-stages — the "Task Stages List" screenshot (the current design; the
   table behind the Details screenshot is the old one and is not built): the header (title,
   subtitle, green "+ Add Task Stage"), four stat cards, the filter bar (search · All Status ·
   Filters → Created At range; no view toggle), then "Workflow Stages" with its "Drag to
   reorder" pill over the stage cards.
   - Drag a card by its handle (mouse, touch or keyboard) to reorder: the list and the Order
     labels change at once, the server rewrites the sequence, and a failure rolls back with a
     toast. While a search or filter is active dragging is off — a partial list can't be
     reordered — and the pill says so.
   - Lock: optimistic toggle; the server's refusals (the done stage, the last active stage)
     roll back with their own message. Delete: a confirm naming the stage; a refusal (the done
     stage) shows inside the dialog.
   - Never paginated: the whole workflow is on screen.
   - Add / Edit share TaskStageFormModal; the eye opens TaskStageDetailsModal. Each keeps its
     record while it animates closed. */

type FormState = { key: number; open: boolean; stage: TaskStage | null }
type DetailsState = { open: boolean; stage: TaskStage | null }

export function TaskStagesPage() {
  const t = useTranslations('taskStages.list')
  const tPage = useTranslations('taskStages.page')
  const list = useTaskStageListParams()
  const { state, params } = list
  const stages = useTaskStages(params)
  const reorder = useReorderTaskStages()
  const remove = useDeleteTaskStage()
  const { mutate: toggleStatus } = useToggleTaskStageStatus()

  // Add / Edit share one modal; a new key per opening gives a fresh form every time.
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, stage: null })
  const [details, setDetails] = React.useState<DetailsState>({ open: false, stage: null })
  const [deleting, setDeleting] = React.useState<TaskStage | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const openCreate = React.useCallback(() => setForm((f) => ({ key: f.key + 1, open: true, stage: null })), [])

  const actionsFor = useTaskStageActions({
    onView: React.useCallback((stage: TaskStage) => setDetails({ open: true, stage }), []),
    onEdit: React.useCallback((stage: TaskStage) => setForm((f) => ({ key: f.key + 1, open: true, stage })), []),
    onToggleStatus: React.useCallback(
      (stage: TaskStage) =>
        toggleStatus(stage.id, {
          onSuccess: (updated) => toast.success(updated.status === 'active' ? t('status.activated') : t('status.deactivated')),
          onError: (error) => {
            const apiError = toApiError(error)
            toast.error(t('status.failed'), apiError.status === 0 ? undefined : apiError.message)
          },
        }),
      [toggleStatus, t],
    ),
    onDelete: React.useCallback((stage: TaskStage) => {
      setDeleteError(null)
      setDeleting(stage)
    }, []),
  })

  const onReorder = React.useCallback(
    (ids: number[]) =>
      reorder.mutate(ids, {
        onSuccess: () => toast.success(t('reorder.saved')),
        onError: (error) => {
          const apiError = toApiError(error)
          toast.error(t('reorder.failed'), apiError.status === 0 ? undefined : apiError.message)
        },
      }),
    [reorder, t],
  )

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

  const data = stages.data
  const filtered = list.isFiltered

  let body: React.ReactNode
  if (stages.isPending) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('loading')}>
        {Array.from({ length: 4 }, (_, i) => (
          <TaskStageCardSkeleton key={i} />
        ))}
      </div>
    )
  } else if (stages.isError && !data) {
    body = (
      <EmptyState
        framed
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(stages.error).message}
        action={
          <Button variant="outline" onClick={() => stages.refetch()}>
            {t('empty.retry')}
          </Button>
        }
      />
    )
  } else if (!data || data.length === 0) {
    body = filtered ? (
      <EmptyState
        framed
        icon={Search}
        title={t('empty.noMatchTitle')}
        description={t('empty.noMatchDescription')}
        action={
          <Button variant="outline" onClick={list.reset}>
            {t('empty.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        framed
        icon={Inbox}
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-icon" aria-hidden="true" />
            {tPage('add')}
          </Button>
        }
      />
    )
  } else {
    body = (
      <SortableList
        label={t('listLabel')}
        items={data}
        getId={(stage) => stage.id}
        getLabel={(stage) => stage.name}
        onReorder={onReorder}
        disabled={filtered}
        className="gap-3"
        renderItem={(stage) => <TaskStageCard stage={stage} actions={actionsFor(stage)} />}
      />
    )
  }

  return (
    <>
      <PageHeader
        title={tPage('title')}
        subtitle={tPage('subtitle')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-icon" aria-hidden="true" />
            {tPage('add')}
          </Button>
        }
      />

      <div className="mt-4 flex flex-col gap-4">
        <TaskStageStats />

        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          defaultAdvancedOpen={state.filters.created_from !== '' || state.filters.created_to !== ''}
          advanced={<TaskStageCreatedFilter filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={filtered}
        >
          <TaskStageStatusFilter filters={state.filters} onChange={list.setFilter} />
        </FilterBar>
      </div>

      <section aria-labelledby="workflow-stages-heading" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="workflow-stages-heading" className="text-title-section">
            {t('heading')}
          </h2>
          <Badge tone={filtered ? 'warning' : 'neutral'} size="sm" outlined aria-live="polite">
            {filtered ? t('dragDisabled') : t('dragHint')}
          </Badge>
        </div>
        {body}
      </section>

      <TaskStageFormModal key={form.key} open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} stage={form.stage} />

      <TaskStageDetailsModal open={details.open} onOpenChange={(open) => setDetails((d) => ({ ...d, open }))} stage={details.stage} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('dialog.cancel')}
        closeLabel={t('dialog.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </>
  )
}
