/* Mirrors backend App\Http\Resources\ClientResource and the client requests. A client belongs
   to the signed-in company — the API never sends or accepts `company_id`. Dates are ISO 8601
   (UTC). `initials`, `website_host` and `status_label` are derived by the API; the UI shows
   them as they come. */

export type ClientStatus = 'active' | 'inactive'

export const CLIENT_STATUSES = ['active', 'inactive'] as const satisfies ReadonlyArray<ClientStatus>

export interface Client {
  id: number
  name: string
  email: string
  phone: string
  /** The client's own company ("Microsoft") — the Company column / field. */
  company_name: string
  address: string
  /** Full URL, or null. */
  website: string | null
  /** "microsoft.com" — the Website badge text; null without a website. */
  website_host: string | null
  /** "MC" — first letters of the first and last words. */
  initials: string
  status: ClientStatus
  /** "Active" | "Inactive" */
  status_label: string
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

/** POST /api/v1/clients and PUT /api/v1/clients/{id} — StoreClientRequest / UpdateClientRequest. */
export interface ClientPayload {
  name: string
  email: string
  phone: string
  company_name: string
  address: string
  /** null = no website */
  website: string | null
  status: ClientStatus
  /** null = no notes */
  notes: string | null
}

/* ── List query ── */

export type ClientSortKey = 'name' | 'email' | 'company_name' | 'status' | 'created_at'

export const CLIENT_SORT_KEYS = ['name', 'email', 'company_name', 'status', 'created_at'] as const satisfies ReadonlyArray<ClientSortKey>

export type ClientFilterName = 'status' | 'created_from' | 'created_to'

/** GET /api/v1/clients (IndexClientRequest). */
export interface ClientListParams {
  /** Name, email, company or phone. */
  search?: string
  status?: ClientStatus
  /** YYYY-MM-DD, inclusive */
  created_from?: string
  /** YYYY-MM-DD, inclusive; not before created_from */
  created_to?: string
  sort?: ClientSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}
