'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import { TASK_STAGE_STATUSES, type TaskStageFilterName, type TaskStageListParams } from '@/features/task-stages/types'

/* The Task Stages list state in the URL
   (/configuration/task-stages?search=…&status=inactive&created_from=…&created_to=…),
   validated against what IndexTaskStageRequest accepts — an unknown value falls back to its
   default instead of a 422. No sort, page or page size: the workflow is always shown whole, in
   stage order. The shared FilterBar debounces the search box (300ms) before it reaches here.
   `isFiltered` is what disables drag-to-reorder (a partial list can't be reordered). */

const DATE = /^\d{4}-\d{2}-\d{2}$/

const NO_SORT: ReadonlyArray<never> = []

const CONFIG: ListParamsConfig<TaskStageFilterName, never> = {
  id: 'company.task-stages',
  filters: {
    status: (value) => (TASK_STAGE_STATUSES as ReadonlyArray<string>).includes(value),
    created_from: (value) => DATE.test(value),
    created_to: (value) => DATE.test(value),
  },
  sortKeys: NO_SORT,
}

export function useTaskStageListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<TaskStageListParams>(() => {
    const { status, created_from, created_to } = state.filters
    // A "to" before "from" would be a 422 — drop the "to" bound instead.
    const to = created_to && created_from && created_to < created_from ? '' : created_to
    return {
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as TaskStageListParams['status'] } : {}),
      ...(created_from ? { created_from } : {}),
      ...(to ? { created_to: to } : {}),
    }
  }, [state])

  return { ...list, params }
}
