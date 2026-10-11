'use client'

import * as React from 'react'
import { CircleArrowDown, Clock, Flame, SquareCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import type { TaskStats as Stats } from '@/features/tasks/types'

/* The four summary cards of the Tasks screenshot — StatCard's `corner` variant, one row from
   `xl`, two from `sm`, stacked on a phone:
     Total Tasks (SquareCheck, blue) · High Priority (Flame, amber — High + Urgent) ·
     Low Priority (CircleArrowDown, emerald — Low + Medium) · Overdue (Clock, `danger` —
     Phase 0 decision 5).
   From GET /tasks/stats — company-wide, whatever the filters. */

export function TaskStats({ stats }: { stats: Stats | undefined }) {
  const t = useTranslations('tasks.stats')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={!stats || undefined}>
      {stats ? (
        <>
          <StatCard variant="corner" hue="blue" icon={SquareCheck} label={t('total')} value={String(stats.total)} />
          <StatCard variant="corner" hue="amber" icon={Flame} label={t('high')} value={String(stats.high)} />
          <StatCard variant="corner" hue="emerald" icon={CircleArrowDown} label={t('low')} value={String(stats.low)} />
          <StatCard variant="corner" hue="danger" icon={Clock} label={t('overdue')} value={String(stats.overdue)} />
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
