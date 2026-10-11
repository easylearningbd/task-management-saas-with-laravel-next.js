import type { ComponentType } from 'react'

/* A details page's tab bar as a typed registry (the project details page's design, shared by
   the task details page): each entry names its label key, where its count comes from (a key the
   page resolves against its own payload), and whether it is `live` (with the component that
   renders it) or `soon` (rendered disabled with a "Coming soon" tooltip, skipped by the
   keyboard). To make a tab live: write its component and change its entry to
   `{ status: 'live', component: … }` — nothing else changes. */

export type TabDef<Id extends string, Props, LabelKey extends string, CountKey extends string = never> = {
  id: Id
  labelKey: LabelKey
  /** The count shown beside the label (resolved by the page); none when absent. */
  count?: CountKey
} & ({ status: 'live'; component: ComponentType<Props> } | { status: 'soon' })

/** The `?tab=` value if it names a live tab, else the fallback. */
export function resolveTab<Id extends string>(
  tabs: ReadonlyArray<{ id: Id; status: 'live' | 'soon' }>,
  value: string | null,
  fallback: Id,
): Id {
  const tab = tabs.find((entry) => entry.id === value)
  return tab && tab.status === 'live' ? tab.id : fallback
}
