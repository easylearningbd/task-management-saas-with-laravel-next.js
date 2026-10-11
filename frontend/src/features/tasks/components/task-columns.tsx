'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { RowActions } from '@/components/shared/row-actions'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import type { TaskAction } from '@/features/tasks/components/task-actions'
import { TaskMilestoneBadge, TaskPriorityBadge, TaskProjectChip, TaskStageLabel } from '@/features/tasks/components/task-badges'
import type { Task, TaskSortKey } from '@/features/tasks/types'

/* The list view (no screenshot — PAGE SPEC A's inferred columns), on the shared DataTable:
   # · Title ↕ · Project (indigo chip) · Milestone (violet badge, or "—") · Stage (its dot + name) ·
   Priority ↕ · Start Date ↕ · Due Date ↕ (`danger` when overdue) · Progress ↕ (bar + %) · Actions.
   Sortable columns are the API's whitelist; the default order is soonest due first.
   Title takes the slack and wraps to two lines at most; chips are capped and cut with a tooltip. */

export function useTaskColumns(actionsFor: (task: Task) => TaskAction[]): DataTableColumn<Task, TaskSortKey>[] {
  const t = useTranslations('tasks.list')

  return React.useMemo<DataTableColumn<Task, TaskSortKey>[]>(
    () => [
      {
        id: 'title',
        header: t('columns.title'),
        sortKey: 'title',
        className: 'w-full min-w-40 max-w-0 whitespace-normal',
        cell: (task) => (
          <span className="line-clamp-2 text-title-row" title={task.title}>
            {task.title}
          </span>
        ),
        skeleton: <Skeleton className="h-4 w-40" />,
      },
      {
        id: 'project',
        header: t('columns.project'),
        className: 'max-w-48',
        cell: (task) => (task.project ? <TaskProjectChip name={task.project.name} className="max-w-44" /> : <NoValue />),
        skeleton: <Skeleton className="h-6 w-32" />,
      },
      {
        id: 'milestone',
        header: t('columns.milestone'),
        className: 'max-w-40',
        cell: (task) => (task.milestone ? <TaskMilestoneBadge title={task.milestone.title} className="max-w-36" /> : <NoValue />),
        skeleton: <Skeleton className="h-6 w-24" />,
      },
      {
        id: 'stage',
        header: t('columns.stage'),
        className: 'whitespace-nowrap',
        cell: (task) => <TaskStageLabel stage={task.stage} />,
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      {
        id: 'priority',
        header: t('columns.priority'),
        sortKey: 'priority',
        cell: (task) => <TaskPriorityBadge task={task} />,
        skeleton: <Skeleton className="h-6 w-16" />,
      },
      {
        id: 'start',
        header: t('columns.start'),
        sortKey: 'start_date',
        className: 'whitespace-nowrap tabular-nums',
        cell: (task) => <span className="text-muted-foreground">{task.start_date}</span>,
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      {
        id: 'due',
        header: t('columns.due'),
        sortKey: 'due_date',
        className: 'whitespace-nowrap tabular-nums',
        cell: (task) => (
          <span className={task.is_overdue ? 'text-danger' : 'text-muted-foreground'}>
            {task.due_date}
            {task.is_overdue ? <span className="sr-only">{` — ${t('overdue')}`}</span> : null}
          </span>
        ),
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      {
        id: 'progress',
        header: t('columns.progress'),
        sortKey: 'progress',
        cell: (task) => (
          <span className="flex items-center gap-2.5">
            <ProgressBar value={task.progress} label={t('progressLabel', { title: task.title })} className="w-16" />
            <span className="text-body-sm text-muted-foreground tabular-nums">{t('percent', { value: task.progress })}</span>
          </span>
        ),
        skeleton: <Skeleton className="h-1.5 w-16" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (task) => <RowActions actions={actionsFor(task)} />,
        skeleton: (
          <span className="inline-flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="size-control-sm rounded-lg" />
            ))}
          </span>
        ),
      },
    ],
    [t, actionsFor],
  )
}

function NoValue() {
  const t = useTranslations('tasks.list')
  return <span className="text-muted-foreground">{t('noValue')}</span>
}
