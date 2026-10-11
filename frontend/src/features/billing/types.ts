/* Mirrors the backend billing resources (App\Http\Resources\PlanCatalogResource, PlanOrderResource)
   and requests (StorePlanPurchaseRequest, PlanActionRequest, IndexPlanOrderRequest). Everything is
   the signed-in company's own — the API never sends or accepts `company_id`. Money is an exact
   2-decimal string ("479.90"); timestamps are ISO 8601 (UTC). Labels come from the API. */

import type { BillingPeriod, Plan } from '@/features/plans/types'

export type PlanDuration = BillingPeriod
export const PLAN_DURATIONS = ['monthly', 'yearly'] as const satisfies ReadonlyArray<PlanDuration>

/* ── The catalog: GET /api/v1/plans ── */

export interface CatalogPlan extends Plan {
  /** This company has trialled the plan (one trial per plan, ever). */
  trial_used: boolean
  /** It may start this plan's trial now (has one, unused, not its plan, nothing pending). */
  trial_available: boolean
}

/** The global bank-transfer settings the checkout shows; null = not set yet. */
export interface BankDetails {
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  bank_branch: string | null
  bank_swift: string | null
  bank_instructions: string | null
}

export const BANK_DETAIL_KEYS = [
  'bank_name',
  'bank_account_name',
  'bank_account_number',
  'bank_branch',
  'bank_swift',
  'bank_instructions',
] as const satisfies ReadonlyArray<keyof BankDetails>

export interface PlanCatalog {
  /** Active plans in `sort_order`. */
  plans: CatalogPlan[]
  /** "Current" matches plan AND duration. */
  current: {
    plan_id: number | null
    duration: PlanDuration | null
    expires_at: string | null
    trial_ends_at: string | null
  }
  /** The order waiting for review — while set, nothing else can be submitted. */
  pending_order: PlanOrder | null
  bank_details: BankDetails
}

/* ── Plan orders ── */

export type PlanOrderType = 'request' | 'purchase' | 'trial'
export const PLAN_ORDER_TYPES = ['request', 'purchase', 'trial'] as const satisfies ReadonlyArray<PlanOrderType>
export type PlanOrderStatus = 'pending' | 'approved' | 'rejected'
export const PLAN_ORDER_STATUSES = ['pending', 'approved', 'rejected'] as const satisfies ReadonlyArray<PlanOrderStatus>
export type PaymentMethod = 'bank_transfer' | 'stripe' | 'manual' | 'free'

export interface PlanOrder {
  id: number
  /** "ORD-2026-0001" */
  order_code: string
  type: PlanOrderType
  type_label: string
  plan: { id: number; name: string } | null
  company: { id: number; name: string; email: string; avatar_url: string | null } | null
  duration: PlanDuration
  duration_label: string
  /** The plan price when submitted — a snapshot. */
  price: string
  discount: string
  final_amount: string
  payment_method: PaymentMethod | null
  payment_method_label: string | null
  payment_reference: string | null
  has_receipt: boolean
  receipt_name: string | null
  /** The authorised route that streams the receipt (`?download=1` for a file); null without one. */
  receipt_url: string | null
  notes: string | null
  status: PlanOrderStatus
  status_label: string
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string | null
}

/** POST /api/v1/plan-orders (multipart) — the checkout. Bank transfer is the only method the API takes. */
export interface PurchasePayload {
  plan_id: number
  duration: PlanDuration
  payment_method: 'bank_transfer'
  receipt: File
  /** null = none; max 100 */
  payment_reference: string | null
  /** null = none; max 2000 */
  notes: string | null
}

/** POST /api/v1/plan-orders/request | /trial | /free */
export interface PlanActionPayload {
  plan_id: number
  duration: PlanDuration
  /** Request Plan only. */
  notes?: string | null
}

/* ── The Plan Requests list: GET /api/v1/plan-orders ── */

export type PlanOrderSortKey = 'company' | 'plan' | 'requested_at'
export const PLAN_ORDER_SORT_KEYS = ['company', 'plan', 'requested_at'] as const satisfies ReadonlyArray<PlanOrderSortKey>

export type PlanOrderFilterName = 'status' | 'type'

/** Default order: newest first. */
export interface PlanOrderListParams {
  /** Order code, payment reference or plan name. */
  search?: string
  status?: PlanOrderStatus
  type?: PlanOrderType
  sort?: PlanOrderSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}
