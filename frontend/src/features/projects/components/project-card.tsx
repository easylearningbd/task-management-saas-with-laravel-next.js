'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { GridCard } from '@/components/shared/card-grid'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { useMoney } from '@/lib/format-money'
import { ProjectPriorityBadge, ProjectStatusBadge } from '@/features/projects/components/project-badges'
import { ProjectClientCell, ProjectProgress } from '@/features/projects/components/project-columns'
import type { Project } from '@/features/projects/types'

/* One project in the grid view (no screenshot — inferred, PAGE SPEC A: "cards with the same data
   and the same four actions"), on a Card.md surface like the Clients grid: the name (two lines
   at most), the client, the priority and status badges, the budget in `text-money` and the
   progress bar, then the four actions under a 1px rule. */
export function ProjectCard({ project, actions }: { project: Project; actions: RowAction[] }) {
  const t = useTranslations('projects.list')
  const money = useMoney()

  return (
    <GridCard className="flex flex-col">
      <h3 className="line-clamp-2 text-title-card" title={project.name}>
        {project.name}
      </h3>
      <div className="mt-3">
        <ProjectClientCell project={project} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ProjectPriorityBadge project={project} />
        <ProjectStatusBadge project={project} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-body-sm text-muted-foreground">{t('columns.budget')}</dt>
          <dd className="mt-0.5 font-mono text-money">{money(project.budget)}</dd>
        </div>
        <div>
          <dt className="text-body-sm text-muted-foreground">{t('columns.progress')}</dt>
          <dd className="mt-1.5">
            <ProjectProgress project={project} className="flex-1" />
          </dd>
        </div>
      </dl>
      <div className="mt-auto pt-4">
        <div className="-mx-card -mb-card border-t border-border px-card py-3">
          <RowActions actions={actions} className="flex w-full flex-wrap justify-between" />
        </div>
      </div>
    </GridCard>
  )
}

export function ProjectCardSkeleton() {
  return (
    <GridCard aria-hidden="true" className="flex flex-col">
      <Skeleton className="h-5 w-3/4" />
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="-mx-card -mb-card mt-4 flex justify-between border-t border-border px-card py-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-control-sm rounded-lg" />
        ))}
      </div>
    </GridCard>
  )
}
