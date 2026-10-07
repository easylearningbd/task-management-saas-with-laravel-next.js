/* Mirrors backend App\Http\Resources\CompanyResource, CompanyDetailResource and
   CompanyActivityResource. A company is a `users` row with type = company. Dates are ISO 8601
   (UTC); money is exact 2-decimal strings. `status` and `is_login_enabled` are independent:
   the Status badge never reflects login, the lock icon never touches status. */

export type CompanyStatus = 'active' | 'inactive'

export const COMPANY_STATUSES = ['active', 'inactive'] as const satisfies ReadonlyArray<CompanyStatus>

export type PlanDuration = 'monthly' | 'yearly'

export const PLAN_DURATIONS = ['monthly', 'yearly'] as const satisfies ReadonlyArray<PlanDuration>

/** A list row. */
export interface Company {
  id: number
  name: string
  email: string
  /** null → the UI shows initials. */
  avatar_url: string | null
  status: CompanyStatus
  /** "Active" | "Inactive" */
  status_label: string
  is_login_enabled: boolean
  email_verified_at: string | null
  /** null = no plan ("—"). */
  plan: { id: number; name: string } | null
  plan_duration: PlanDuration | null
  /** "Monthly" | "Yearly" */
  plan_duration_label: string | null
  plan_expires_at: string | null
  trial_ends_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** GET /api/v1/admin/companies/{id} — the details page payload. */
export interface CompanyDetail extends Omit<Company, 'plan'> {
  plan: { id: number; name: string; monthly_price: string; yearly_price: string } | null
  limits: {
    /** -1 = unlimited; null = no plan. */
    max_projects: number | null
    /** 2-decimal GB string; null = no plan. */
    storage_limit_gb: string | null
  }
  /** Honest zeros until projects and uploads exist (backend TODO). */
  usage: { projects: number; storage_bytes: number }
  /** Whether a password was ever set — turning login on needs one. */
  has_password: boolean
  recent_activities: CompanyActivity[]
}

export type CompanyActivityAction =
  | 'created'
  | 'updated'
  | 'plan_changed'
  | 'login_enabled'
  | 'login_disabled'
  | 'password_reset'
  | 'impersonated'
  | 'impersonation_ended'
  | 'deleted'

export interface CompanyActivity {
  id: number
  action: CompanyActivityAction
  /** "Plan changed", "Login disabled", … */
  action_label: string
  description: string | null
  meta: Record<string, unknown> | null
  /** Present on the global log (and per-company log). */
  company?: { id: number; name: string; email: string; deleted: boolean } | null
  /** null = system / seeder. */
  actor?: { id: number; name: string; email: string } | null
  created_at: string | null
}

/* ── Payloads ── */

/** POST /api/v1/admin/companies — StoreCompanyRequest. */
export interface CreateCompanyPayload {
  name: string
  email: string
  enable_login: boolean
  /** Only with enable_login. */
  password?: string
  password_confirmation?: string
}

/** PUT /api/v1/admin/companies/{id} — UpdateCompanyRequest. Blank password = keep it. */
export interface UpdateCompanyPayload {
  name: string
  email: string
  status: CompanyStatus
  enable_login: boolean
  password?: string
  password_confirmation?: string
}

/** PATCH …/reset-password */
export interface ResetCompanyPasswordPayload {
  password: string
  password_confirmation: string
}

/** PATCH …/change-plan */
export interface ChangeCompanyPlanPayload {
  plan_id: number
  duration: PlanDuration
}

/* ── List queries ── */

export type CompanySortKey = 'name' | 'email' | 'status' | 'created_at'

export const COMPANY_SORT_KEYS = ['name', 'email', 'status', 'created_at'] as const satisfies ReadonlyArray<CompanySortKey>

export type CompanyFilterName = 'status' | 'plan_id' | 'created_from' | 'created_to'

/** GET /api/v1/admin/companies (IndexCompanyRequest). */
export interface CompanyListParams {
  search?: string
  status?: CompanyStatus
  plan_id?: number
  /** YYYY-MM-DD, inclusive */
  created_from?: string
  /** YYYY-MM-DD, inclusive; not before created_from */
  created_to?: string
  sort?: CompanySortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}

/** GET …/activities and /api/v1/admin/activities (IndexActivityRequest; newest first). */
export interface ActivityListParams {
  page: number
  per_page: number
  action?: CompanyActivityAction
}
