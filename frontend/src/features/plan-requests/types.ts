/* The super admin's Plan Requests (PRD §8.4) — mirrors App\Http\Resources\AdminPlanOrderResource,
   Admin\IndexPlanOrderRequest and Admin\RejectPlanOrderRequest. The same `plan_orders` rows the
   companies see (features/billing), across every company, plus who reviewed each one and — while
   pending — what approving it would set. */

import type { PlanOrder, PlanOrderStatus, PlanOrderType } from '@/features/billing/types'

export interface AdminPlanOrder extends PlanOrder {
  /** The super admin who approved or rejected it; null while pending. */
  reviewer: { id: number; name: string } | null
  /**
   * Pending only (null once reviewed): what approval would set now — `expires_at` from the same
   * function the approval runs; null `expires_at` = a $0 plan, which never expires.
   */
  approval: { expires_at: string | null } | null
}

export type AdminPlanOrderSortKey = 'company' | 'plan' | 'created_at' | 'status'
export const ADMIN_PLAN_ORDER_SORT_KEYS = ['company', 'plan', 'created_at', 'status'] as const satisfies ReadonlyArray<AdminPlanOrderSortKey>

export type AdminPlanOrderFilterName = 'status' | 'type' | 'plan_id'

/** GET /api/v1/admin/plan-orders — newest first by default; an unknown sort is refused (422). */
export interface AdminPlanOrderListParams {
  /** Company name or email, plan name, order code, payment reference. */
  search?: string
  status?: PlanOrderStatus
  type?: PlanOrderType
  plan_id?: number
  sort?: AdminPlanOrderSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}

/** PATCH /api/v1/admin/plan-orders/{id}/reject */
export interface RejectPlanOrderPayload {
  /** Required, at most REJECT_REASON_MAX characters — the company reads it. */
  reason: string
}

export const REJECT_REASON_MAX = 500
