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
   - UI-only parameters (`ui`, e.g. the list/grid view) live in the URL and the session too,
     but are never sent to the API, never cleared by Reset and don't change the page.
   - Updates use router.replace: refining a list doesn't flood the history. */

export type UiParam = {
  values: ReadonlyArray<string>
  default: string
}

export type ListParamsConfig<F extends string, S extends string, U extends string = never> = {
  /** Session-storage key for this table's remembered choices, e.g. "admin.coupons". */
  id: string
  /** Filter name → validator for its URL value ('' = not filtered). */
  filters: Record<F, (value: string) => boolean>
  /** Columns the API accepts in `sort`. */
  sortKeys: ReadonlyArray<S>
  defaultPerPage?: number
  perPageOptions?: ReadonlyArray<number>
  /** UI-only parameters (not API filters), e.g. `{ view: { values: ['list', 'grid'], default: 'list' } }`. */
  ui?: Record<U, UiParam>
}

export type ListState<F extends string, S extends string, U extends string = never> = {
  search: string
  filters: Record<F, string>
  sort: SortState<S> | null
  page: number
  perPage: number
  ui: Record<U, string>
}

export type ListApiParams = Record<string, string | number>

const NO_UI: Record<string, UiParam> = {}

export function useListParams<F extends string, S extends string, U extends string = never>(config: ListParamsConfig<F, S, U>) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const defaultPerPage = config.defaultPerPage ?? PER_PAGE_OPTIONS[0]
  const options = config.perPageOptions ?? PER_PAGE_OPTIONS
  const uiConfig = (config.ui ?? NO_UI) as Record<U, UiParam>
  const stored = useStoredChoices(config.id)

  const state = React.useMemo<ListState<F, S, U>>(() => {
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
    const storedPerPage = Number(stored.per_page)
    const perPage = options.includes(urlPerPage)
      ? urlPerPage
      : options.includes(storedPerPage)
        ? storedPerPage
        : defaultPerPage

    // UI-only: the URL, else this session's last choice, else the default.
    const ui = Object.fromEntries(
      (Object.keys(uiConfig) as U[]).map((name) => {
        const { values, default: fallback } = uiConfig[name]
        const fromUrl = read(name)
        const fromStore = stored[name] ?? ''
        return [name, values.includes(fromUrl) ? fromUrl : values.includes(fromStore) ? fromStore : fallback]
      }),
    ) as Record<U, string>

    return {
      search: read('search'),
      filters,
      sort,
      page: Number.isInteger(page) && page > 1 ? page : 1,
      perPage,
      ui,
    }
  }, [searchParams, config.filters, config.sortKeys, options, stored, defaultPerPage, uiConfig])

  // The query string most recently written but not yet reflected in `searchParams`: router.replace
  // lands asynchronously, so two changes in a row (e.g. "from" then "to") must build on each
  // other instead of both starting from the old URL. Cleared once the URL catches up.
  const pending = React.useRef<string | null>(null)
  React.useEffect(() => {
    pending.current = null
  }, [searchParams])

  /** Writes changes to the URL; '' / null / defaults remove the parameter. */
  const update = React.useCallback(
    (changes: Record<string, string | number | null>, resetPage: boolean) => {
      const next = new URLSearchParams(pending.current ?? searchParams.toString())
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
      pending.current = query
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
        writeStoredChoice(config.id, 'per_page', String(perPage))
        update({ per_page: perPage === defaultPerPage ? null : perPage, page }, false)
      },
      /** A UI-only parameter (e.g. the view): remembered for the session; the page stays. */
      setUi: (name: U, value: string) => {
        const param = uiConfig[name]
        if (!param || !param.values.includes(value)) return
        writeStoredChoice(config.id, name, value)
        update({ [name]: value === param.default ? null : value }, false)
      },
      /** Clears search and every filter; keeps the sort, page size and UI parameters. */
      reset: () =>
        update(
          Object.fromEntries([['search', null], ...Object.keys(config.filters).map((name) => [name, null])]),
          true,
        ),
    }),
    [update, config.id, config.filters, defaultPerPage, uiConfig],
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
    return params // UI-only parameters never reach the API
  }, [state])

  return { state, isFiltered, apiParams, ...actions }
}

/* ── Per-table session memory (sessionStorage: rows per page, UI parameters) ──────────────
   Keys look like `list:<id>:per_page` / `list:<id>:view`. Read through useSyncExternalStore
   as one JSON string per table (a stable primitive snapshot): the server snapshot is empty, so
   hydration matches, and every list using the same id stays in sync. */

const STORAGE_EVENT = 'list-params:stored'
const storagePrefix = (id: string) => `list:${id}:`
const EMPTY = '{}'

function useStoredChoices(id: string): Record<string, string> {
  const snapshot = React.useSyncExternalStore(
    (onChange) => {
      window.addEventListener(STORAGE_EVENT, onChange)
      return () => window.removeEventListener(STORAGE_EVENT, onChange)
    },
    () => {
      try {
        const prefix = storagePrefix(id)
        const entries: Array<[string, string]> = []
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key?.startsWith(prefix)) entries.push([key.slice(prefix.length), window.sessionStorage.getItem(key) ?? ''])
        }
        entries.sort(([a], [b]) => a.localeCompare(b))
        return entries.length ? JSON.stringify(Object.fromEntries(entries)) : EMPTY
      } catch {
        return EMPTY // storage blocked (privacy mode)
      }
    },
    () => EMPTY,
  )
  return React.useMemo(() => JSON.parse(snapshot) as Record<string, string>, [snapshot])
}

function writeStoredChoice(id: string, key: string, value: string) {
  try {
    window.sessionStorage.setItem(`${storagePrefix(id)}${key}`, value)
  } catch {
    // storage blocked — the URL still carries the choice
  }
  window.dispatchEvent(new Event(STORAGE_EVENT))
}
