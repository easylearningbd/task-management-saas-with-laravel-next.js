import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/** The backend's error shape: `{ message, errors?: { field: [messages] } }`. */
export interface ApiErrorBody {
  message: string
  errors?: Record<string, string[]>
}

export interface ApiError {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number
  message: string
  fieldErrors: Record<string, string>
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
    }
  }
  return { status: 0, message: error instanceof Error ? error.message : String(error), fieldErrors: {} }
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
