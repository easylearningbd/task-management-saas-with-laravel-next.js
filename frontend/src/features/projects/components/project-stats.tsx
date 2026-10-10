'use client'

import * as React from 'react'
import { FileText, Folder, Lock, SquareCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import type { ProjectStats as Stats } from '@/features/projects/types'

/* The four summary cards of the Projects screenshot — StatCard's `corner` variant (the soft
   icon in the design's quarter-circle), one row from `xl`, two from `sm`, stacked on a phone:
     Total Projects (Folder, blue) · Active Projects (SquareCheck, emerald) ·
     Completed (FileText, indigo) · On Hold (Lock, amber). No card for Inactive (its count is on
   the status tab). From GET /projects/stats — company-wide, whatever the filters. */

export function ProjectStats({ stats }: { stats: Stats | undefined }) {
  const t = useTranslations('projects.stats')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={!stats || undefined}>
      {stats ? (
        <>
          <StatCard variant="corner" hue="blue" icon={Folder} label={t('total')} value={String(stats.total)} />
          <StatCard variant="corner" hue="emerald" icon={SquareCheck} label={t('active')} value={String(stats.active)} />
          <StatCard variant="corner" hue="indigo" icon={FileText} label={t('completed')} value={String(stats.completed)} />
          <StatCard variant="corner" hue="amber" icon={Lock} label={t('onHold')} value={String(stats.on_hold)} />
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
