'use client'

import * as React from 'react'
import { ChartColumn, Layers, ListChecks, Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { useTaskStageStats } from '@/features/task-stages/api'

/* The four summary cards of the Task Stages screenshot — StatCard's `corner` variant, one row
   from `xl`, two from `sm`, stacked on a phone:
     Total Stages (Layers, blue) · Active Stages (ListChecks, emerald) ·
     Done Stage — the done stage's NAME, not a number (Star, violet) · Inactive Stages
     (ChartColumn, amber). From GET /task-stages/stats; "-" if a company has no done stage. */

export function TaskStageStats() {
  const t = useTranslations('taskStages.stats')
  const stats = useTaskStageStats()
  const data = stats.data

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={stats.isPending || undefined}>
      {data ? (
        <>
          <StatCard variant="corner" hue="blue" icon={Layers} label={t('total')} value={String(data.total)} />
          <StatCard variant="corner" hue="emerald" icon={ListChecks} label={t('active')} value={String(data.active)} />
          <StatCard variant="corner" hue="violet" icon={Star} label={t('doneStage')} value={data.done_stage?.name ?? t('none')} />
          <StatCard variant="corner" hue="amber" icon={ChartColumn} label={t('inactive')} value={String(data.inactive)} />
        </>
      ) : (
        Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-xs">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))
      )}
    </div>
  )
}
