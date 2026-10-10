import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/** The backend's error shape: `{ message, errors?: { field: [messages] } }`, plus a machine
 *  `code` on refusals the UI treats specially (App\Exceptions\PlanLimitReached). */
export interface ApiErrorBody {
  message: string
  code?: string
  errors?: Record<string, string[]>
}

/** PlanLimitReached codes: the plan's project count / storage allowance would be exceeded. */
export const PLAN_LIMIT_CODES = ['plan_limit_reached', 'storage_limit_reached'] as const

export type PlanLimitCode = (typeof PLAN_LIMIT_CODES)[number]

export interface ApiError {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number
  message: string
  fieldErrors: Record<string, string>
  /** The body's `code`, when it has one (e.g. "plan_limit_reached"). */
  code: string | null
}

export function toApiError(error: unknown): ApiError {
  if (isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data
    return {
      status: error.response?.status ?? 0,
      message: body?.message ?? error.message,
      fieldErrors: Object.fromEntries(
        Object.entries(body?.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']),
      ),
      code: typeof body?.code === 'string' ? body.code : null,
    }
  }
  return { status: 0, message: error instanceof Error ? error.message : String(error), fieldErrors: {}, code: null }
}

/** A 422 from a plan limit — the form shows its message with an Upgrade action. */
export function isPlanLimitError(apiError: ApiError): apiError is ApiError & { code: PlanLimitCode } {
  return apiError.status === 422 && (PLAN_LIMIT_CODES as ReadonlyArray<string | null>).includes(apiError.code)
}

/**
 * Puts backend 422 messages under the matching react-hook-form fields.
 * Returns true when at least one known field received an error.
 */
export function applyFieldErrors<T extends FieldValues>(
  apiError: ApiError,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): boolean {
  let applied = false
  for (const field of fields) {
    const message = apiError.fieldErrors[field]
    if (message) {
      setError(field, { type: 'server', message }, { shouldFocus: !applied })
      applied = true
    }
  }
  return applied
}
