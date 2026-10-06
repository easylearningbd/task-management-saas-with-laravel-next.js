/* Mirrors backend App\Http\Resources\CouponResource. Money values are exact 2-decimal strings
   ("50.00") — never floats; null limits mean unlimited. The `*_display` / `type_label` fields
   are ready to show, so the UI never formats discounts or limits itself. */

export type CouponType = 'percentage' | 'flat'

export const COUPON_TYPES = ['percentage', 'flat'] as const satisfies ReadonlyArray<CouponType>

export interface Coupon {
  id: number
  name: string
  /** Always uppercase. */
  code: string
  type: CouponType
  /** "Percentage" | "Flat Amount" */
  type_label: string
  /** A percent (0 < v ≤ 100) or a currency amount, per `type`. */
  value: string
  /** "50%" | "$100.00" */
  discount_display: string
  min_spend: string | null
  max_spend: string | null
  /** null = unlimited */
  usage_limit: number | null
  /** "100" | "Unlimited" */
  usage_limit_display: string
  per_user_limit: number | null
  per_user_limit_display: string
  /** YYYY-MM-DD */
  expiry_date: string | null
  is_expired: boolean
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

/** How the code was produced: typed by the admin, or generated (collisions get a new code). */
export type CodeMode = 'manual' | 'auto'

/** POST /api/v1/admin/coupons and PUT /api/v1/admin/coupons/{id} — StoreCouponRequest. */
export interface CouponPayload {
  name: string
  code_mode: CodeMode
  /** Uppercase; may be null only with code_mode "auto" (the server generates one). */
  code: string | null
  type: CouponType
  value: string
  min_spend: string | null
  max_spend: string | null
  /** null = unlimited */
  usage_limit: number | null
  per_user_limit: number | null
  /** YYYY-MM-DD */
  expiry_date: string | null
  is_active?: boolean
}

/* ── List query (IndexCouponRequest) ── */

export type CouponStatusFilter = 'active' | 'inactive'

export const COUPON_STATUS_FILTERS = ['active', 'inactive'] as const satisfies ReadonlyArray<CouponStatusFilter>

export type CouponSortKey = 'name' | 'code' | 'type' | 'expiry_date' | 'created_at'

export const COUPON_SORT_KEYS = ['name', 'code', 'type', 'expiry_date', 'created_at'] as const satisfies ReadonlyArray<CouponSortKey>

export type CouponFilterName = 'type' | 'status' | 'expiry_from' | 'expiry_to'

/** GET /api/v1/admin/coupons query parameters. */
export interface CouponListParams {
  search?: string
  type?: CouponType
  status?: CouponStatusFilter
  /** YYYY-MM-DD, inclusive */
  expiry_from?: string
  /** YYYY-MM-DD, inclusive; not before expiry_from */
  expiry_to?: string
  sort?: CouponSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}
