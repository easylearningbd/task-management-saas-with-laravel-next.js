'use client'

import * as React from 'react'
import { FileText, Flag, Folder, Lock, SquareCheck, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Tabs, type TabItem } from '@/components/shared/tabs'
import type { ProjectStats, ProjectStatus } from '@/features/projects/types'

/* The status tabs of the Projects screenshot — the shared underline Tabs (Tabs.md) with icons
   and count chips: All (Folder) · Active (SquareCheck) · Completed (FileText) · On Hold (Lock) ·
   Inactive (Flag). They write the `status` filter ('' = All); counts are the company-wide
   stats. Tabs.md: a zero-count tab is disabled, not hidden — unless it is the one selected
   (e.g. right after the last inactive project was activated), so the selection never vanishes.
   Manual activation: arrows move focus, Enter / Space filters (each change refetches). */

export const PROJECT_STATUS_TABS_ID = 'project-status'

type TabValue = 'all' | ProjectStatus

const TABS: ReadonlyArray<{ value: TabValue; icon: LucideIcon; count: (stats: ProjectStats) => number }> = [
  { value: 'all', icon: Folder, count: (s) => s.total },
  { value: 'active', icon: SquareCheck, count: (s) => s.active },
  { value: 'completed', icon: FileText, count: (s) => s.completed },
  { value: 'on_hold', icon: Lock, count: (s) => s.on_hold },
  { value: 'inactive', icon: Flag, count: (s) => s.inactive },
]

export function ProjectStatusTabs({
  status,
  onStatusChange,
  stats,
}: {
  /** '' = All */
  status: string
  onStatusChange: (status: string) => void
  stats: ProjectStats | undefined
}) {
  const t = useTranslations('projects.list.tabs')
  const value: TabValue = (TABS.some((tab) => tab.value === status) ? status : 'all') as TabValue

  const items: TabItem<TabValue>[] = TABS.map((tab) => {
    const count = stats ? tab.count(stats) : undefined
    return {
      value: tab.value,
      label: t(tab.value),
      icon: tab.icon,
      count,
      disabled: tab.value !== 'all' && count === 0 && tab.value !== value,
    }
  })

  return (
    <Tabs
      idBase={PROJECT_STATUS_TABS_ID}
      label={t('label')}
      items={items}
      value={value}
      onValueChange={(next) => onStatusChange(next === 'all' ? '' : next)}
    />
  )
}
