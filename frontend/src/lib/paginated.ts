/* Laravel's paginated API Resource collection (`Resource::collection($paginator)`), as returned
   by every list endpoint built on App\Support\ListQuery. */

export interface PaginationMeta {
  current_page: number
  /** null when the page is empty. */
  from: number | null
  last_page: number
  path: string
  per_page: number
  to: number | null
  total: number
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface Paginated<T> {
  data: T[]
  links: PaginationLinks
  meta: PaginationMeta
}
