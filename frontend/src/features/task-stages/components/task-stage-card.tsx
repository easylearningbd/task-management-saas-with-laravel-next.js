'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { DragHandle } from '@/components/shared/sortable-list'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TaskStage } from '@/features/task-stages/types'
import { cn } from '@/lib/cn'

/* One stage of the Workflow Stages list — the Task Stages screenshot's card, left to right:
   the six-dot drag handle · "Order: n" (muted, a fixed 64px so the dots line up) · a 10px dot
   in the stage's own colour (Phase 0 decision 7) · the name (`title-card`) · a blue "Done Stage"
   badge on the done stage · the Active (`success`) / Inactive (`neutral`) badge · pushed right:
   the task count (20px/700) over "tasks" (`caption`, muted) · the eye, pencil, lock and trash.
   A `radius-xl` `card` with a 1px border and `shadow-xs`, 70px tall at desktop width; on a phone
   the count and actions wrap onto a second line. The task count is the API's `tasks_count`
   — 0 until the Tasks module exists (backend TODO(tasks)); nothing is made up here. */

export function TaskStageCard({
  stage,
  actions,
  className,
}: {
  stage: TaskStage
  actions: RowAction[]
  className?: string
}) {
  const t = useTranslations('taskStages.list')

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 shadow-xs',
        className,
      )}
    >
      {/* Below `sm` this row takes the whole width, so the count and actions wrap beneath it. */}
      <div className="flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-1 sm:flex-1 sm:basis-0">
        <DragHandle label={t('reorderHandle', { name: stage.name })} />
        <span className="min-w-16 text-body whitespace-nowrap text-muted-foreground">{t('order', { order: stage.order })}</span>
        {/* The colour itself is data (the stage's), not a design token. */}
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
        <span className="min-w-0 truncate text-title-card" title={stage.name}>
          {stage.name}
        </span>
        {stage.is_done_stage ? (
          <Badge tone="info" size="sm" outlined>
            {t('doneStage')}
          </Badge>
        ) : null}
        <TaskStageStatusBadge stage={stage} />
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="min-w-12 text-center">
          <p className="text-xl leading-7 font-bold">{stage.tasks_count}</p>
          <p className="text-caption font-normal text-muted-foreground">{t('tasks', { count: stage.tasks_count })}</p>
        </div>
        <RowActions actions={actions} />
      </div>
    </div>
  )
}

export function TaskStageStatusBadge({ stage }: { stage: Pick<TaskStage, 'status' | 'status_label'> }) {
  return (
    <Badge tone={stage.status === 'active' ? 'success' : 'neutral'} size="sm" outlined>
      {stage.status_label}
    </Badge>
  )
}

/** The loading placeholder: one card's shape. */
export function TaskStageCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
      <Skeleton className="size-control-sm rounded-lg" />
      <Skeleton className="h-4 w-14" />
      <Skeleton className="size-2.5 rounded-full" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-5 w-14" />
      <span className="ml-auto flex items-center gap-4">
        <span className="flex flex-col items-center gap-1">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-3 w-10" />
        </span>
        <span className="hidden gap-1.5 sm:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-control-sm rounded-lg" />
          ))}
        </span>
      </span>
    </div>
  )
}
