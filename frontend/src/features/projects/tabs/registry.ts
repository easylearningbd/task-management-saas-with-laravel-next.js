import type { ComponentType } from 'react'
import type { Messages } from 'next-intl'
import type { ProjectCounts, ProjectDetail } from '@/features/projects/types'
import { ExpensesTab } from '@/features/projects/tabs/expenses-tab'
import { FilesTab } from '@/features/projects/tabs/files-tab'
import { ItemsTab } from '@/features/projects/tabs/items-tab'
import { MilestonesTab } from '@/features/projects/tabs/milestones-tab'
import { NotesTab } from '@/features/projects/tabs/notes-tab'
import { OverviewTab } from '@/features/projects/tabs/overview-tab'

/* The project details tab bar, as a typed registry (Phase 0 design). Order is the screenshot's:
     Overview · Milestones (n) · Items (n) · Notes (n) · Expenses (n) · Contracts · Files (n)
   Each entry names its label, where its count comes from (the details payload's `counts`), and
   whether it is `live` (with the component that renders it) or `soon` (rendered disabled with
   a "Coming soon" tooltip, skipped by the keyboard).
   To make a tab live: write its component (tabs/<id>-tab.tsx) and change its entry to
   `{ status: 'live', component: … }` — nothing else changes. Contracts stays `soon` until the
   contracts module ships (TODO(contracts)). */

export type ProjectTabId = 'overview' | 'milestones' | 'items' | 'notes' | 'expenses' | 'contracts' | 'files'

export type ProjectTabProps = { project: ProjectDetail }

type LabelKey = keyof Messages['projects']['details']['tabs']

type Base = {
  id: ProjectTabId
  labelKey: LabelKey
  /** The count shown beside the label, from the details payload; none for Overview. */
  count?: keyof ProjectCounts
}

export type ProjectTabDef = Base & ({ status: 'live'; component: ComponentType<ProjectTabProps> } | { status: 'soon' })

export const PROJECT_TABS: ReadonlyArray<ProjectTabDef> = [
  { id: 'overview', labelKey: 'overview', status: 'live', component: OverviewTab },
  { id: 'milestones', labelKey: 'milestones', count: 'milestones', status: 'live', component: MilestonesTab },
  { id: 'items', labelKey: 'items', count: 'items', status: 'live', component: ItemsTab },
  { id: 'notes', labelKey: 'notes', count: 'notes', status: 'live', component: NotesTab },
  { id: 'expenses', labelKey: 'expenses', count: 'expenses', status: 'live', component: ExpensesTab },
  // TODO(contracts): live once the contracts module ships.
  { id: 'contracts', labelKey: 'contracts', status: 'soon' },
  { id: 'files', labelKey: 'files', count: 'files', status: 'live', component: FilesTab },
]

export const DEFAULT_PROJECT_TAB: ProjectTabId = 'overview'

/** The `?tab=` value if it names a live tab, else the default. */
export function resolveProjectTab(value: string | null): ProjectTabId {
  const tab = PROJECT_TABS.find((entry) => entry.id === value)
  return tab && tab.status === 'live' ? tab.id : DEFAULT_PROJECT_TAB
}
