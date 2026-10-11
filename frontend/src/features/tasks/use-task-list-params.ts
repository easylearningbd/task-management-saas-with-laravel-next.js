'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  TASK_PRIORITIES,
  TASK_SORT_KEYS,
  type TaskBoardParams,
  type TaskFilterName,
  type TaskFilters,
  type TaskListParams,
  type TaskPriority,
  type TaskSortKey,
} from '@/features/tasks/types'

/* The Tasks page state in the URL (/tasks?search=…&project_id=3&milestone_id=9&
   task_stage_id=2&priority=high&view=list&sort=due_date&direction=desc&page=2&per_page=25),
   validated against what IndexTaskRequest accepts — an unknown value falls back to its default
   instead of a 422. The priority tabs write `priority` ('' = All); the selects write
   `project_id`, `milestone_id` and `task_stage_id`. `view` (board | list, default board) is
   UI-only. The shared useListParams resets to page 1 on any search / filter / sort change and
   remembers rows-per-page and the view for the session.
   - A milestone only filters within its project: without `project_id` it is ignored, and
     choosing another project (or All Projects) clears it (`setProject`).
   - `isFiltered` (search, a tab or any select) is what disables dragging on the board — a
     filtered column is only part of the sequence the move endpoint rewrites. */

const ID = (value: string) => /^[1-9]\d*$/.test(value)

const CONFIG: ListParamsConfig<TaskFilterName, TaskSortKey, 'view'> = {
  id: 'company.tasks',
  filters: {
    project_id: ID,
    milestone_id: ID,
    task_stage_id: ID,
    priority: (value) => (TASK_PRIORITIES as ReadonlyArray<string>).includes(value),
  },
  sortKeys: TASK_SORT_KEYS,
  ui: { view: { values: ['board', 'list'], default: 'board' } },
}

export type TaskView = 'board' | 'list'

export function useTaskListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const filters = React.useMemo<TaskFilters>(() => {
    const { project_id, milestone_id, task_stage_id, priority } = state.filters
    return {
      ...(state.search ? { search: state.search } : {}),
      ...(project_id ? { project_id: Number(project_id) } : {}),
      ...(project_id && milestone_id ? { milestone_id: Number(milestone_id) } : {}),
      ...(task_stage_id ? { task_stage_id: Number(task_stage_id) } : {}),
      ...(priority ? { priority: priority as TaskPriority } : {}),
    }
  }, [state.search, state.filters])

  const boardParams = React.useMemo<TaskBoardParams>(() => filters, [filters])

  const listParams = React.useMemo<TaskListParams>(
    () => ({
      ...filters,
      page: state.page,
      per_page: state.perPage,
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }),
    [filters, state.page, state.perPage, state.sort],
  )

  const view = state.ui.view as TaskView
  const { setUi, setFilters } = list
  const setView = React.useCallback((next: TaskView) => setUi('view', next), [setUi])

  /** A new project (or '' = All Projects) clears the milestone. */
  const setProject = React.useCallback((projectId: string) => setFilters({ project_id: projectId, milestone_id: '' }), [setFilters])

  // What actually reaches the API (a milestone without its project doesn't).
  const isFiltered = Object.keys(filters).length > 0

  return { ...list, isFiltered, filters, boardParams, listParams, view, setView, setProject }
}
