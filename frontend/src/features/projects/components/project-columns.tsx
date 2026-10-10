'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useMoney } from '@/lib/format-money'
import { ProjectPriorityBadge, ProjectStatusBadge } from '@/features/projects/components/project-badges'
import type { Project, ProjectSortKey } from '@/features/projects/types'

/* The Projects table, in the screenshot's order:
   # (DataTable) · Name ↕ · Client (initials avatar, name bold, email muted) · Priority · Status ·
   Budget (`text-money`, font-mono) · Progress (green bar + %) · Actions.
   Only Name carries a sort control, as drawn; the other whitelisted sorts stay reachable
   through the URL. Below `2xl` (1536px) the row is fitted to a 1440px screen without sideways
   scrolling (measured: 1174px of columns in a 1047px area before): the name takes the slack and
   wraps to two lines at most (full name in the title), the client cell is capped and truncates
   its email, and the progress bar is shorter; from `2xl` up the client and bar widen and the name
   takes whatever is left.
   TODO(tasks): Progress is the API's figure — 0% until the tasks module ships. */

export function useProjectColumns(actionsFor: (project: Project) => RowAction[]): DataTableColumn<Project, ProjectSortKey>[] {
  const t = useTranslations('projects.list')
  const money = useMoney()

  return React.useMemo<DataTableColumn<Project, ProjectSortKey>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        sortKey: 'name',
        className: 'w-full min-w-36 max-w-0 whitespace-normal',
        cell: (project) => (
          <span className="line-clamp-2 text-title-row" title={project.name}>
            {project.name}
          </span>
        ),
        skeleton: <Skeleton className="h-4 w-48" />,
      },
      {
        id: 'client',
        header: t('columns.client'),
        cell: (project) => <ProjectClientCell project={project} className="max-w-48 2xl:max-w-56" />,
        skeleton: (
          <span className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <span className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </span>
          </span>
        ),
      },
      {
        id: 'priority',
        header: t('columns.priority'),
        cell: (project) => <ProjectPriorityBadge project={project} />,
        skeleton: <Skeleton className="h-6 w-16" />,
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: (project) => <ProjectStatusBadge project={project} />,
        skeleton: <Skeleton className="h-6 w-20" />,
      },
      {
        id: 'budget',
        header: t('columns.budget'),
        className: 'whitespace-nowrap',
        cell: (project) => <span className="font-mono text-money">{money(project.budget)}</span>,
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      {
        id: 'progress',
        header: t('columns.progress'),
        cell: (project) => <ProjectProgress project={project} className="w-16 2xl:w-24" />,
        skeleton: <Skeleton className="h-1.5 w-16 2xl:w-24" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (project) => <RowActions actions={actionsFor(project)} />,
        skeleton: (
          <span className="inline-flex gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-control-sm rounded-lg" />
            ))}
          </span>
        ),
      },
    ],
    [t, money, actionsFor],
  )
}

/** The client: initials avatar (coloured by name), name over email; "-" if none. */
export function ProjectClientCell({ project, className }: { project: Pick<Project, 'client'>; className?: string }) {
  const t = useTranslations('projects.list')
  if (!project.client) return <span className="text-muted-foreground">{t('noValue')}</span>
  return (
    <IdentityCell
      name={project.client.name}
      secondary={project.client.email}
      initials={project.client.initials}
      colorKey={project.client.name}
      outlined
      size="row"
      className={className}
    />
  )
}

/** The green bar with its percentage beside it. */
export function ProjectProgress({ project, className }: { project: Pick<Project, 'progress' | 'name'>; className?: string }) {
  const t = useTranslations('projects.list')
  return (
    <span className="flex items-center gap-2.5">
      <ProgressBar value={project.progress} label={t('progressLabel', { name: project.name })} className={className} />
      <span className="text-body-sm text-muted-foreground tabular-nums">{t('percent', { value: project.progress })}</span>
    </span>
  )
}
