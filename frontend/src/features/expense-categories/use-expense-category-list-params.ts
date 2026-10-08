'use client'

import * as React from 'react'
import { useListParams, type ListParamsConfig } from '@/lib/use-list-params'
import {
  EXPENSE_CATEGORY_SORT_KEYS,
  EXPENSE_CATEGORY_STATUSES,
  type ExpenseCategoryFilterName,
  type ExpenseCategoryListParams,
  type ExpenseCategorySortKey,
} from '@/features/expense-categories/types'

/* The Expense Categories list state in the URL
   (/configuration/expense-categories?search=…&status=inactive&sort=name&direction=desc&page=2),
   validated against what IndexExpenseCategoryRequest accepts — an unknown value falls back to
   its default instead of a 422. The shared useListParams resets to page 1 on any search /
   filter / sort change. The search here is explicit (the Search button / Enter call
   setSearch); nothing debounces keystrokes into the URL. */

const CONFIG: ListParamsConfig<ExpenseCategoryFilterName, ExpenseCategorySortKey> = {
  id: 'company.expense-categories',
  filters: {
    status: (value) => (EXPENSE_CATEGORY_STATUSES as ReadonlyArray<string>).includes(value),
  },
  sortKeys: EXPENSE_CATEGORY_SORT_KEYS,
}

export function useExpenseCategoryListParams() {
  const list = useListParams(CONFIG)
  const { state } = list

  const params = React.useMemo<ExpenseCategoryListParams>(() => {
    const { status } = state.filters
    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.search ? { search: state.search } : {}),
      ...(status ? { status: status as ExpenseCategoryListParams['status'] } : {}),
      ...(state.sort ? { sort: state.sort.key, direction: state.sort.direction } : {}),
    }
  }, [state])

  return { ...list, params }
}
