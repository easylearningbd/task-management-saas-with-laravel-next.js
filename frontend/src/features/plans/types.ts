/* Mirrors backend App\Http\Resources\PlanResource. Money and storage are exact 2-decimal
   strings ("19.99") — never floats; `yearly_price` is the stored value (computed by the
   server when it was left empty), so the UI never does money math. */

export interface Plan {
  id: number
  name: string
  description: string | null
  monthly_price: string
  yearly_price: string
  /** -1 = unlimited (see `is_unlimited`). */
  max_projects: number
  is_unlimited: boolean
  storage_limit_gb: string
  trial_enabled: boolean
  trial_days: number
  ai_integration: boolean
  is_active: boolean
  is_default: boolean
  is_recommended: boolean
  sort_order: number
  subscribers_count: number
  created_at: string | null
  updated_at: string | null
}

export type BillingPeriod = 'monthly' | 'yearly'

/** POST /api/v1/admin/plans and PUT /api/v1/admin/plans/{id} — StorePlanRequest. */
export interface PlanPayload {
  name: string
  description: string | null
  monthly_price: string
  /** null → the server stores monthly × 12 × 0.8. */
  yearly_price: string | null
  max_projects: number
  storage_limit_gb: string
  trial_enabled: boolean
  trial_days: number
  ai_integration: boolean
  is_active: boolean
  is_default: boolean
}
