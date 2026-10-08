/* Mirrors backend App\Http\Resources\ExpenseCategoryResource and the category requests. A
   category belongs to the signed-in company — the API never sends or accepts `company_id`.
   Dates are ISO 8601 (UTC). `color` always arrives as uppercase `#RRGGBB`. */

export type ExpenseCategoryStatus = 'active' | 'inactive'

export const EXPENSE_CATEGORY_STATUSES = ['active', 'inactive'] as const satisfies ReadonlyArray<ExpenseCategoryStatus>

export interface ExpenseCategory {
  id: number
  name: string
  description: string | null
  /** "#3B82F6" */
  color: string
  status: ExpenseCategoryStatus
  /** "Active" | "Inactive" */
  status_label: string
  created_at: string | null
  updated_at: string | null
}

/** POST /api/v1/expense-categories and PUT …/{id} — Store/UpdateExpenseCategoryRequest. */
export interface ExpenseCategoryPayload {
  name: string
  /** null = no description */
  description: string | null
  /** "#RRGGBB" */
  color: string
  status: ExpenseCategoryStatus
}

/* ── List query ── */

export type ExpenseCategorySortKey = 'name' | 'status' | 'created_at'

export const EXPENSE_CATEGORY_SORT_KEYS = ['name', 'status', 'created_at'] as const satisfies ReadonlyArray<ExpenseCategorySortKey>

export type ExpenseCategoryFilterName = 'status'

/** GET /api/v1/expense-categories (IndexExpenseCategoryRequest). */
export interface ExpenseCategoryListParams {
  /** Name or description. */
  search?: string
  status?: ExpenseCategoryStatus
  sort?: ExpenseCategorySortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}
