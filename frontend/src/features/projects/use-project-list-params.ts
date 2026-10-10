'use client'

import * as React from 'react'
import type { ViewMode } from '@/components/ui/view-toggle'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  PROJECT_PRIORITIES,
  PROJECT_SORT_KEYS,
  PROJECT_STATUSES,
  type ProjectFilterName,
  type ProjectListParams,
  type ProjectSortKey,
} from '@/features/projects/types'

/* The Projects list state in the URL (/projects?search=…&status=active&priority=high&
   client_id=7&created_from=…&created_to=…&sort=name&direction=desc&page=2&per_page=25&
   view=grid), validated against what IndexProjectRequest accepts — an unknown value falls back
   to its default instead of a 422. The status tabs write `status` ('' = All); the selects write
   `priority` and `client_id`; the Filters panel the Created At range (`created_from` /
   `created_to`). The shared useListParams resets to page 1 on any search / filter / sort change
   and remembers rows-per-page and the view for the session. `view` (list | grid) is UI-only. */

const DATE = /^\d{4}-\d{2}-\d{2}$/

const CONFIG: ListParamsConfig<ProjectFilterName, ProjectSortKey, 'view'> = {
  id: 'company.projects',
  filters: {
    status: (value) => (PROJECT_STATUSES as ReadonlyArray<string>).includes(value),
    priority: (value) => (PROJECT_PRIORITIES as ReadonlyArray<string>).includes(value),
    client_id: (value) => /^[1-9]\d*$/.test(value),
    created_from: (value) => DATE.test(value),
    created_to: (value) => DATE.test(value),
  },
  sortKeys: PROJECT_SORT_KEYS,
  ui: { view: { values: ['list', 'grid'], default: 'list' } },
}

export function useProjectListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<ProjectListParams>(() => {
    const { status, priority, client_id, created_from, created_to } = state.filters
    // A "to" before "from" would be a 422 — drop the "to" bound instead.
    const to = created_to && created_from && created_to < created_from ? '' : created_to
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as ProjectListParams['status'] } : {}),
      ...(priority ? { priority: priority as ProjectListParams['priority'] } : {}),
      ...(client_id ? { client_id: Number(client_id) } : {}),
      ...(created_from ? { created_from } : {}),
      ...(to ? { created_to: to } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }
  }, [state])

  const view = state.ui.view as ViewMode
  const { setUi } = list
  const setView = React.useCallback((next: ViewMode) => setUi('view', next), [setUi])

  return { ...list, params, view, setView }
}
