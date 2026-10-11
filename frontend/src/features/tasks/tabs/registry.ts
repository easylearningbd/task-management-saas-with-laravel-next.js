import type { Messages } from 'next-intl'
import { resolveTab, type TabDef } from '@/components/shared/tab-registry'
import { ChecklistTab } from '@/features/tasks/tabs/checklist-tab'
import { DetailsTab } from '@/features/tasks/tabs/details-tab'
import { FilesTab } from '@/features/tasks/tabs/files-tab'
import type { TaskDetail } from '@/features/tasks/types'

/* The task details tab bar — the same typed registry as the project details page
   (components/shared/tab-registry.ts), in the screenshot's order:
     Details · Checklist (n) · Files (n)
   Counts come from the details payload: the checklist's item total and the attached files. */

export type TaskTabId = 'details' | 'checklist' | 'files'

export type TaskTabProps = { task: TaskDetail }

type LabelKey = keyof Messages['tasks']['details']['tabs']

/** Where a tab's count comes from (resolved by `taskTabCount`). */
export type TaskCountKey = 'checklist' | 'files'

export type TaskTabDef = TabDef<TaskTabId, TaskTabProps, LabelKey, TaskCountKey>

export const TASK_TABS: ReadonlyArray<TaskTabDef> = [
  { id: 'details', labelKey: 'details', status: 'live', component: DetailsTab },
  { id: 'checklist', labelKey: 'checklist', count: 'checklist', status: 'live', component: ChecklistTab },
  { id: 'files', labelKey: 'files', count: 'files', status: 'live', component: FilesTab },
]

export const DEFAULT_TASK_TAB: TaskTabId = 'details'

export function resolveTaskTab(value: string | null): TaskTabId {
  return resolveTab(TASK_TABS, value, DEFAULT_TASK_TAB)
}

export function taskTabCount(task: TaskDetail, key: TaskCountKey): number {
  return key === 'checklist' ? task.checklist_summary.total : task.files_count
}
