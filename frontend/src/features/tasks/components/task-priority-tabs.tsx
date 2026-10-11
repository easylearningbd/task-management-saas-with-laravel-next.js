'use client'

import * as React from 'react'
import { CircleAlert, CircleArrowDown, CircleArrowUp, CircleMinus, LayoutGrid, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Tabs, type TabItem } from '@/components/shared/tabs'
import type { TaskPriority, TaskStats } from '@/features/tasks/types'

/* The priority tabs of the Tasks screenshot — the shared underline Tabs with icons and count
   chips, inside the filter card on its bottom edge (no rule of their own):
   All (LayoutGrid) · Urgent (CircleAlert) · High (CircleArrowUp) · Medium (CircleMinus) ·
   Low (CircleArrowDown). They write the `priority` filter ('' = All); counts are the
   company-wide stats. As on Projects, a zero-count tab is disabled unless it is the one
   selected. Manual activation: arrows move focus, Enter / Space filters. */

export const TASK_PRIORITY_TABS_ID = 'task-priority'

type TabValue = 'all' | TaskPriority

const TABS: ReadonlyArray<{ value: TabValue; icon: LucideIcon }> = [
  { value: 'all', icon: LayoutGrid },
  { value: 'urgent', icon: CircleAlert },
  { value: 'high', icon: CircleArrowUp },
  { value: 'medium', icon: CircleMinus },
  { value: 'low', icon: CircleArrowDown },
]

export function TaskPriorityTabs({
  priority,
  onPriorityChange,
  stats,
}: {
  /** '' = All */
  priority: string
  onPriorityChange: (priority: string) => void
  stats: TaskStats | undefined
}) {
  const t = useTranslations('tasks.list.tabs')
  const value: TabValue = (TABS.some((tab) => tab.value === priority) ? priority : 'all') as TabValue

  const items: TabItem<TabValue>[] = TABS.map((tab) => {
    const count = stats ? (tab.value === 'all' ? stats.total : stats.priorities[tab.value]) : undefined
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
      idBase={TASK_PRIORITY_TABS_ID}
      label={t('label')}
      items={items}
      value={value}
      rule={false}
      onValueChange={(next) => onPriorityChange(next === 'all' ? '' : next)}
    />
  )
}
