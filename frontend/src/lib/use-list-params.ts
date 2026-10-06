'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { SortState } from '@/components/shared/data-table'
import { PER_PAGE_OPTIONS } from '@/components/shared/pagination'

/* A list page's state — search, filters, sort, page, rows per page — kept in the URL query
   string, so a view is shareable and survives a refresh. The URL uses
   the API's own parameter names (`search`, `sort`, `direction`, `page`, `per_page`, plus the
   module's filters), so `apiParams` can be sent as-is to an App\Http\Requests\IndexRequest
   endpoint.

   - Every value read from the URL is validated; anything unknown falls back to its default.
   - Defaults are left out of the URL (`/admin/coupons`, not `?page=1&per_page=10`).
   - Changing search, a filter, the sort or the page size goes back to page 1 (the page size
     change instead keeps the first visible record in view — Pagination passes that page).
   - Rows per page also persists per table for the browser session (RowsPerPage.md); the URL
     wins when it has one.
   - Updates use router.replace: refining a list doesn't flood the history. */

export type ListParamsConfig<F extends string, S extends string> = {
  /** Session-storage key for this table's page size, e.g. "admin.coupons". */
  id: string
  /** Filter name → validator for its URL value ('' = not filtered). */
  filters: Record<F, (value: string) => boolean>
  /** Columns the API accepts in `sort`. */
  sortKeys: ReadonlyArray<S>
  defaultPerPage?: number
  perPageOptions?: ReadonlyArray<number>
}

export type ListState<F extends string, S extends string> = {
  search: string
  filters: Record<F, string>
  sort: SortState<S> | null
  page: number
  perPage: number
}

export type ListApiParams = Record<string, string | number>

export function useListParams<F extends string, S extends string>(config: ListParamsConfig<F, S>) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const defaultPerPage = config.defaultPerPage ?? PER_PAGE_OPTIONS[0]
  const options = config.perPageOptions ?? PER_PAGE_OPTIONS
  const storedPerPage = useStoredPerPage(config.id)

  const state = React.useMemo<ListState<F, S>>(() => {
    const read = (key: string) => searchParams.get(key)?.trim() ?? ''
    const filterNames = Object.keys(config.filters) as F[]

    const filters = Object.fromEntries(
      filterNames.map((name) => {
        const value = read(name)
        return [name, value !== '' && config.filters[name](value) ? value : '']
      }),
    ) as Record<F, string>

    const sortKey = read('sort') as S
    const direction = read('direction')
    const sort: SortState<S> | null = config.sortKeys.includes(sortKey)
      ? { key: sortKey, direction: direction === 'desc' ? 'desc' : 'asc' }
      : null

    const page = Number(read('page'))
    const urlPerPage = Number(read('per_page'))
    const perPage = options.includes(urlPerPage)
      ? urlPerPage
      : storedPerPage !== null && options.includes(storedPerPage)
        ? storedPerPage
        : defaultPerPage

    return {
      search: read('search'),
      filters,
      sort,
      page: Number.isInteger(page) && page > 1 ? page : 1,
      perPage,
    }
  }, [searchParams, config.filters, config.sortKeys, options, storedPerPage, defaultPerPage])

  /** Writes changes to the URL; '' / null / defaults remove the parameter. */
  const update = React.useCallback(
    (changes: Record<string, string | number | null>, resetPage: boolean) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(changes)) {
        const isDefault =
          value === null ||
          value === '' ||
          (key === 'page' && Number(value) <= 1) ||
          (key === 'per_page' && Number(value) === defaultPerPage)
        if (isDefault) next.delete(key)
        else next.set(key, String(value))
      }
      if (resetPage) next.delete('page')
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname, defaultPerPage],
  )

  const actions = React.useMemo(
    () => ({
      setSearch: (search: string) => update({ search: search.trim() }, true),
      setFilter: (name: F, value: string) => update({ [name]: value }, true),
      setFilters: (values: Partial<Record<F, string>>) => update(values as Record<string, string>, true),
      setSort: (sort: SortState<S> | null) =>
        update({ sort: sort?.key ?? null, direction: sort ? sort.direction : null }, true),
      setPage: (page: number) => update({ page }, false),
      /** `page` = the page that keeps the first visible record in view (from Pagination). */
      setPerPage: (perPage: number, page = 1) => {
        // Stored first, so a default-size choice (left out of the URL) still wins over an older one.
        writeStoredPerPage(config.id, perPage)
        update({ per_page: perPage === defaultPerPage ? null : perPage, page }, false)
      },
      /** Clears search and every filter; keeps the sort and page size. */
      reset: () =>
        update(
          Object.fromEntries([['search', null], ...Object.keys(config.filters).map((name) => [name, null])]),
          true,
        ),
    }),
    [update, config.id, config.filters, defaultPerPage],
  )

  const isFiltered = state.search !== '' || Object.values<string>(state.filters).some((value) => value !== '')

  const apiParams = React.useMemo<ListApiParams>(() => {
    const params: ListApiParams = { page: state.page, per_page: state.perPage }
    if (state.search) params.search = state.search
    for (const [name, value] of Object.entries<string>(state.filters)) if (value) params[name] = value
    if (state.sort) {
      params.sort = state.sort.key
      params.direction = state.sort.direction
    }
    return params
  }, [state])

  return { state, isFiltered, apiParams, ...actions }
}

/* ── Rows-per-page memory (sessionStorage, per table) ──────────────────────────────────────
   Read through useSyncExternalStore: the server snapshot is null, so hydration matches, and
   every list using the same id stays in sync. */

const STORAGE_EVENT = 'list-params:per-page'
const storageKey = (id: string) => `list:${id}:per_page`

function useStoredPerPage(id: string): number | null {
  return React.useSyncExternalStore(
    (onChange) => {
      window.addEventListener(STORAGE_EVENT, onChange)
      return () => window.removeEventListener(STORAGE_EVENT, onChange)
    },
    () => {
      try {
        const value = Number(window.sessionStorage.getItem(storageKey(id)))
        return Number.isInteger(value) && value > 0 ? value : null
      } catch {
        return null // storage blocked (privacy mode)
      }
    },
    () => null,
  )
}

function writeStoredPerPage(id: string, perPage: number) {
  try {
    window.sessionStorage.setItem(storageKey(id), String(perPage))
  } catch {
    // storage blocked — the URL still carries the choice
  }
  window.dispatchEvent(new Event(STORAGE_EVENT))
}
