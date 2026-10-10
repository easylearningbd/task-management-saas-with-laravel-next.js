'use client'

import * as React from 'react'
import { DollarSign, FileText, Target } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { useMoney } from '@/lib/format-money'
import type { ProjectDetail } from '@/features/projects/types'

/* The four summary cards of the project details screenshot — StatCard's `corner` variant (as on
   the list page) with a caption, one row from `xl`, two from `sm`:
     Total Tasks (Target, blue) — count + "{n} completed"
     Expenses (DollarSign, emerald) — money spent + "Budget utilization"
     Milestones (Target, violet) — "{done}/{total}" + "{x}% complete"
     Contracts (FileText, amber) — "{active}/{total}" + "Active contracts"
   Every figure is the API's (ProjectFigures). Honest zeros:
   TODO(tasks): Total Tasks reads 0 / "0 completed" until the tasks module ships.
   TODO(contracts): Contracts reads 0/0 until the contracts module ships. */

export function ProjectSummaryCards({ project }: { project: ProjectDetail }) {
  const t = useTranslations('projects.details.summary')
  const money = useMoney()
  const f = project.figures

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        variant="corner"
        hue="blue"
        icon={Target}
        label={t('tasks')}
        value={String(f.tasks.total)}
        caption={t('tasksCompleted', { count: f.tasks.completed })}
      />
      <StatCard variant="corner" hue="emerald" icon={DollarSign} label={t('expenses')} value={money(f.budget.spent)} caption={t('budgetUtilization')} />
      <StatCard
        variant="corner"
        hue="violet"
        icon={Target}
        label={t('milestones')}
        value={t('ratio', { done: f.milestones.completed, total: f.milestones.total })}
        caption={t('percentComplete', { percent: f.milestones.percent })}
      />
      <StatCard
        variant="corner"
        hue="amber"
        icon={FileText}
        label={t('contracts')}
        value={t('ratio', { done: f.contracts.active, total: f.contracts.total })}
        caption={t('activeContracts')}
      />
    </div>
  )
}

export function ProjectSummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-xs">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}
