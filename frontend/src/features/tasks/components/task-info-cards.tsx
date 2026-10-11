'use client'

import * as React from 'react'
import { Flag, Folder, Layers, Signpost } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import type { TaskDetail } from '@/features/tasks/types'

/* The four info cards of the task details screenshot — StatCard's `corner` variant with TEXT
   values (`valueKind="text"`), one row from `xl`, two from `sm`, stacked on a phone:
     Project (Folder, blue) · Milestone (Signpost, violet — no pink token, Phase 0 decision 5;
     a muted "—" without one) · Stage (Layers, blue) · Priority (Flag, amber).
   Long names are cut with an ellipsis before the corner (the full name in the title). */

export function TaskInfoCards({ task }: { task: TaskDetail }) {
  const t = useTranslations('tasks.details.info')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard variant="corner" valueKind="text" hue="blue" icon={Folder} label={t('project')} value={task.project?.name ?? t('none')} valueMuted={!task.project} />
      <StatCard
        variant="corner"
        valueKind="text"
        hue="violet"
        icon={Signpost}
        label={t('milestone')}
        value={task.milestone?.title ?? t('none')}
        valueMuted={!task.milestone}
      />
      <StatCard variant="corner" valueKind="text" hue="blue" icon={Layers} label={t('stage')} value={task.stage.name} />
      <StatCard variant="corner" valueKind="text" hue="amber" icon={Flag} label={t('priority')} value={task.priority_label} />
    </div>
  )
}

export function TaskInfoCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-xs">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-36" />
        </div>
      ))}
    </div>
  )
}
